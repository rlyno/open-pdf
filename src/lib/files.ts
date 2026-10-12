import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

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

/** Picks images and normalises them to JPEG/PNG that pdf-lib can embed. */
export type PickedImage = ImageInput & { uri: string; name: string; width: number; height: number };

export async function pickImages(opts: { multiple: boolean; maxSide?: number }): Promise<PickedImage[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: opts.multiple,
    orderedSelection: opts.multiple,
    quality: 1,
  });
  if (res.canceled) return [];
  const maxSide = opts.maxSide ?? 2400;
  const out: PickedImage[] = [];
  for (const asset of res.assets) {
    // Keep PNG so transparent signatures stay transparent; everything else
    // (HEIC, WebP, ...) becomes JPEG.
    const isPng = asset.mimeType === 'image/png' || /\.png$/i.test(asset.fileName ?? asset.uri);
    const ctx = ImageManipulator.manipulate(asset.uri);
    const longest = Math.max(asset.width, asset.height);
    if (longest > maxSide) {
      ctx.resize(asset.width >= asset.height ? { width: maxSide } : { height: maxSide });
    }
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({
      format: isPng ? SaveFormat.PNG : SaveFormat.JPEG,
      compress: 0.9,
    });
    out.push({
      uri: saved.uri,
      name: asset.fileName ?? 'gambar',
      kind: isPng ? 'png' : 'jpg',
      width: saved.width,
      height: saved.height,
      bytes: await readBytes(saved.uri),
    });
  }
  return out;
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
