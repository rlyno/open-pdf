import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { t } from '@/lib/i18n';
import type { ImageInput } from '@/lib/pdf/ops';

export type PickedFile = { uri: string; name: string; size: number };

export type OutputFile = {
  uri: string;
  name: string;
  size: number;
  modified: number;
  mimeType: string;
};

const OUTPUT_DIR = new Directory(Paths.document, 'outputs');

export async function pickPdfs(multiple: boolean): Promise<PickedFile[]> {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    multiple,
    copyToCacheDirectory: true,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size ?? new File(a.uri).size }));
}

export async function readBytes(uri: string): Promise<Uint8Array> {
  return new File(uri).bytes();
}

export type PickedImage = ImageInput & { uri: string; name: string; width: number; height: number };

/** Picks images and normalises them to JPEG/PNG that pdf-lib can embed. */
export async function pickImages(opts: { multiple: boolean; maxSide?: number }): Promise<PickedImage[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: opts.multiple,
    orderedSelection: opts.multiple,
    quality: 1,
  });
  if (res.canceled) return [];
  const out: PickedImage[] = [];
  for (const a of res.assets) {
    out.push(await normalizeImage(a.uri, a.fileName ?? 'gambar', a.mimeType, opts.maxSide));
  }
  return out;
}

/**
 * Re-encodes any image the OS can decode (HEIC, WebP, ...) as JPEG, keeping
 * PNG so transparent signatures stay transparent, and caps its longest side.
 */
export async function normalizeImage(
  uri: string,
  name: string,
  mimeType?: string | null,
  maxSide = 2400
): Promise<PickedImage> {
  const isPng = mimeType === 'image/png' || /\.png$/i.test(name || uri);
  let image = await ImageManipulator.manipulate(uri).renderAsync();
  if (Math.max(image.width, image.height) > maxSide) {
    const ctx = ImageManipulator.manipulate(image);
    ctx.resize(image.width >= image.height ? { width: maxSide } : { height: maxSide });
    image = await ctx.renderAsync();
  }
  const saved = await image.saveAsync({ format: isPng ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.9 });
  return {
    uri: saved.uri,
    name,
    kind: isPng ? 'png' : 'jpg',
    width: saved.width,
    height: saved.height,
    bytes: await readBytes(saved.uri),
  };
}

const INCOMING_DIR = new Directory(Paths.cache, 'incoming');

/**
 * Copies a file handed over by another app (share sheet or "Open with") into
 * our cache, since content:// and security-scoped URIs may stop being
 * readable once the hand-off ends.
 */
export async function importIncoming(uri: string, name: string | null, ext: string): Promise<PickedFile> {
  if (!INCOMING_DIR.exists) INCOMING_DIR.create({ intermediates: true });
  const src = new File(uri);
  let srcName = '';
  try {
    srcName = src.name;
  } catch {
    // Some providers expose no name at all.
  }
  // Document providers often yield an internal id (e.g. "msf:20") rather than
  // the display name, so only trust candidates that look like a file name.
  const looksNamed = (n?: string | null) => !!n && /\.[a-z0-9]{2,5}$/i.test(n);
  // e.g. ".../document/primary%3ADownload%2Fcontoh.pdf" -> "contoh.pdf"
  const segment = decodeURIComponent(uri.split('/').pop() ?? '').replace(/^.*[:/]/, '');
  const picked = [name, srcName, segment].find(looksNamed);
  const clean = sanitize(picked ?? `${t('dokumen')}.${ext}`);
  const dest = new File(INCOMING_DIR, `${Date.now()}-${clean}`);
  // Read + write rather than copy(): copy() rejects content:// sources
  // that have no file name.
  const bytes = await src.bytes();
  dest.create();
  dest.write(bytes);
  return { uri: dest.uri, name: clean, size: bytes.length };
}

function ensureOutputDir() {
  if (!OUTPUT_DIR.exists) OUTPUT_DIR.create({ intermediates: true });
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'dokumen';
}

/** Writes bytes into the app's output folder, never overwriting a file. */
export function saveOutput(name: string, bytes: Uint8Array): OutputFile {
  ensureOutputDir();
  const clean = sanitize(name);
  const dot = clean.lastIndexOf('.');
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const ext = dot > 0 ? clean.slice(dot) : '';
  let file = new File(OUTPUT_DIR, clean);
  for (let i = 2; file.exists; i++) file = new File(OUTPUT_DIR, `${stem} (${i})${ext}`);
  file.create();
  file.write(bytes);
  return toOutput(file);
}

function mimeOf(name: string) {
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  if (/\.zip$/i.test(name)) return 'application/zip';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.png$/i.test(name)) return 'image/png';
  return 'application/octet-stream';
}

function toOutput(file: File): OutputFile {
  return {
    uri: file.uri,
    name: file.name,
    size: file.size,
    modified: file.modificationTime ?? Date.now(),
    mimeType: mimeOf(file.name),
  };
}

export function listOutputs(): OutputFile[] {
  if (!OUTPUT_DIR.exists) return [];
  return OUTPUT_DIR.list()
    .filter((e): e is File => e instanceof File)
    .map(toOutput)
    .sort((a, b) => b.modified - a.modified);
}

export function deleteOutput(uri: string) {
  const f = new File(uri);
  if (f.exists) f.delete();
}

export async function shareFile(file: Pick<OutputFile, 'uri' | 'mimeType'>) {
  await Sharing.shareAsync(file.uri, {
    mimeType: file.mimeType,
    UTI: file.mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
  });
}

/**
 * Lets the user keep a copy outside the app. Android gets the system folder
 * picker; iOS uses the share sheet, whose "Save to Files" does the same.
 * Returns false when the user cancels.
 */
export async function exportFile(file: OutputFile): Promise<boolean> {
  if (Platform.OS !== 'android') {
    await shareFile(file);
    return true;
  }
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return false;
  }
  const target = dir.createFile(file.name, file.mimeType);
  target.write(await readBytes(file.uri));
  return true;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
