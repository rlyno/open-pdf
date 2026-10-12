/**
 * Pure PDF operations. Every function takes raw bytes and returns raw bytes,
 * with no React Native or Expo imports, so this module runs (and is tested)
 * in plain Node as well as on device.
 */
import {
  LineCapStyle,
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  degrees,
  rgb,
  type SecurityOptions,
} from '@cantoo/pdf-lib';

import { t } from '../i18n';

export type Bytes = Uint8Array;

export class PdfToolError extends Error {}

const PRODUCER = 'Open PDF';

/** Loads a PDF, turning pdf-lib's errors into messages a user can act on. */
export async function loadPdf(bytes: Bytes, password?: string): Promise<PDFDocument> {
  try {
    const doc = await PDFDocument.load(bytes, { password, updateMetadata: false });
    if (doc.isEncrypted && !password) {
      throw new PdfToolError(t('PDF ini dilindungi password. Buka dulu dengan alat "Hapus Password".'));
    }
    return doc;
  } catch (e) {
    if (e instanceof PdfToolError) throw e;
    const msg = String((e as Error)?.message ?? e);
    if (/encrypt|password/i.test(msg)) {
      throw new PdfToolError(
        password
          ? t('Password salah atau tidak didukung.')
          : t('PDF ini dilindungi password. Buka dulu dengan alat "Hapus Password".')
      );
    }
    throw new PdfToolError(t('File bukan PDF yang valid: {msg}', { msg }));
  }
}

async function save(doc: PDFDocument, useObjectStreams = true): Promise<Bytes> {
  doc.setProducer(PRODUCER);
  doc.setModificationDate(new Date());
  return doc.save({ useObjectStreams });
}

// ---------------------------------------------------------------------------
// Page ranges
// ---------------------------------------------------------------------------

/**
 * Parses a 1-based range expression such as "1-3, 5, 8-" into 0-based page
 * indices, preserving order and allowing repeats ("3,1,2" reorders).
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const out: number[] = [];
  const parts = input.split(/[,;\s]+/).filter(Boolean);
  if (parts.length === 0) throw new PdfToolError(t('Masukkan nomor halaman, contoh: 1-3,5'));
  for (const part of parts) {
    const m = /^(\d*)\s*-\s*(\d*)$/.exec(part);
    let from: number;
    let to: number;
    if (m) {
      from = m[1] ? parseInt(m[1], 10) : 1;
      to = m[2] ? parseInt(m[2], 10) : pageCount;
    } else if (/^\d+$/.test(part)) {
      from = to = parseInt(part, 10);
    } else {
      throw new PdfToolError(t('Rentang tidak valid: "{part}"', { part }));
    }
    if (from < 1 || to < 1 || from > pageCount || to > pageCount) {
      throw new PdfToolError(t('Halaman "{part}" di luar jangkauan (1–{max}).', { part, max: pageCount }));
    }
    const step = from <= to ? 1 : -1;
    for (let p = from; p !== to + step; p += step) out.push(p - 1);
  }
  return out;
}

/** Splits a range expression into groups, one output file per comma part. */
export function parseRangeGroups(input: string, pageCount: number): number[][] {
  return input
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => parsePageRanges(part, pageCount));
}

// ---------------------------------------------------------------------------
// Info & metadata
// ---------------------------------------------------------------------------

export type PdfInfo = {
  pageCount: number;
  encrypted: boolean;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  /** Visual page sizes in points (rotation applied). */
  pageSizes: { width: number; height: number }[];
  hasForm: boolean;
};

export async function getInfo(bytes: Bytes): Promise<PdfInfo> {
  let doc: PDFDocument;
  let encrypted = false;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
    encrypted = doc.isEncrypted;
  } catch {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    encrypted = true;
  }
  let hasForm = false;
  try {
    hasForm = doc.getForm().getFields().length > 0;
  } catch {
    // Broken or encrypted AcroForm: treat as no form.
  }
  return {
    pageCount: doc.getPageCount(),
    encrypted,
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    keywords: doc.getKeywords(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate(),
    pageSizes: doc.getPages().map(visualSize),
    hasForm,
  };
}

export type Metadata = {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
};

export async function setMetadata(bytes: Bytes, meta: Metadata): Promise<Bytes> {
  const doc = await loadPdf(bytes);
  doc.setTitle(meta.title ?? '');
  doc.setAuthor(meta.author ?? '');
  doc.setSubject(meta.subject ?? '');
  doc.setKeywords(
    (meta.keywords ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  );
  doc.setCreator(meta.creator ?? '');
  return save(doc);
}

// ---------------------------------------------------------------------------
// Organize
// ---------------------------------------------------------------------------

export async function merge(files: Bytes[]): Promise<Bytes> {
  if (files.length < 2) throw new PdfToolError(t('Pilih minimal 2 file PDF.'));
  const out = await PDFDocument.create();
  for (const bytes of files) {
    const src = await loadPdf(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return save(out);
}

/** Builds a new document containing `indices` (0-based, in that order). */
export async function selectPages(bytes: Bytes, indices: number[]): Promise<Bytes> {
  if (indices.length === 0) throw new PdfToolError(t('Tidak ada halaman yang dipilih.'));
  const src = await loadPdf(bytes);
  return save(await copyInto(src, indices));
}

async function copyInto(src: PDFDocument, indices: number[]): Promise<PDFDocument> {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  const title = src.getTitle();
  if (title) out.setTitle(title);
  const author = src.getAuthor();
  if (author) out.setAuthor(author);
  return out;
}

export async function removePages(bytes: Bytes, remove: number[]): Promise<Bytes> {
  const src = await loadPdf(bytes);
  const drop = new Set(remove);
  const keep = src.getPageIndices().filter((i) => !drop.has(i));
  if (keep.length === 0) throw new PdfToolError(t('Tidak bisa menghapus semua halaman.'));
  if (keep.length === src.getPageCount()) throw new PdfToolError(t('Pilih halaman yang ingin dihapus.'));
  return save(await copyInto(src, keep));
}

export async function splitIntoGroups(bytes: Bytes, groups: number[][]): Promise<Bytes[]> {
  const src = await loadPdf(bytes);
  const out: Bytes[] = [];
  for (const g of groups) {
    if (g.length) out.push(await save(await copyInto(src, g)));
  }
  if (out.length === 0) throw new PdfToolError(t('Tidak ada halaman untuk dipisah.'));
  return out;
}

export async function splitEvery(bytes: Bytes, n: number): Promise<Bytes[]> {
  if (!Number.isInteger(n) || n < 1) throw new PdfToolError(t('Jumlah halaman per file harus ≥ 1.'));
  const src = await loadPdf(bytes);
  const groups: number[][] = [];
  const all = src.getPageIndices();
  for (let i = 0; i < all.length; i += n) groups.push(all.slice(i, i + n));
  const out: Bytes[] = [];
  for (const g of groups) out.push(await save(await copyInto(src, g)));
  return out;
}

/** Rotates the given pages (all when omitted) by a multiple of 90°. */
export async function rotate(bytes: Bytes, angle: number, pageIndices?: number[]): Promise<Bytes> {
  if (angle % 90 !== 0) throw new PdfToolError(t('Sudut rotasi harus kelipatan 90°.'));
  const doc = await loadPdf(bytes);
  const targets = pageIndices ?? doc.getPageIndices();
  if (targets.length === 0) throw new PdfToolError(t('Pilih halaman yang ingin diputar.'));
  for (const i of targets) {
    const page = doc.getPage(i);
    const next = (((page.getRotation().angle + angle) % 360) + 360) % 360;
    page.setRotation(degrees(next));
  }
  return save(doc);
}

/** Places 2 or 4 source pages onto each A4 sheet. */
export async function nUp(bytes: Bytes, perSheet: 2 | 4): Promise<Bytes> {
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(src.getPages());
  // 2-up uses landscape A4 with two columns; 4-up uses portrait A4 in a 2x2 grid.
  const [W, H] = perSheet === 2 ? [841.89, 595.28] : [595.28, 841.89];
  const cols = 2;
  const rows = perSheet === 2 ? 1 : 2;
  const gap = 12;
  const cellW = (W - gap * (cols + 1)) / cols;
  const cellH = (H - gap * (rows + 1)) / rows;
  for (let i = 0; i < embedded.length; i += perSheet) {
    const sheet = out.addPage([W, H]);
    for (let k = 0; k < perSheet && i + k < embedded.length; k++) {
      const ep = embedded[i + k];
      const col = k % cols;
      const row = Math.floor(k / cols);
      const scale = Math.min(cellW / ep.width, cellH / ep.height);
      const w = ep.width * scale;
      const h = ep.height * scale;
      const x = gap + col * (cellW + gap) + (cellW - w) / 2;
      const y = H - gap - (row + 1) * cellH - row * gap + (cellH - h) / 2;
      sheet.drawPage(ep, { x, y, width: w, height: h });
    }
  }
  return save(out);
}

// ---------------------------------------------------------------------------
// Convert
// ---------------------------------------------------------------------------

export type ImageInput = { bytes: Bytes; kind: 'jpg' | 'png' };

export type ImagesToPdfOptions = {
  pageSize: 'fit' | 'A4' | 'Letter';
  /** Margin in points, ignored for `fit`. */
  margin: number;
};

const PAGE_SIZES = { A4: [595.28, 841.89], Letter: [612, 792] } as const;

export async function imagesToPdf(images: ImageInput[], opts: ImagesToPdfOptions): Promise<Bytes> {
  if (images.length === 0) throw new PdfToolError(t('Pilih minimal 1 gambar.'));
  const doc = await PDFDocument.create();
  for (const img of images) {
    const embedded = img.kind === 'png' ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
    if (opts.pageSize === 'fit') {
      // 96 dpi pixels -> 72 dpi points keeps on-screen size familiar.
      const w = embedded.width * 0.75;
      const h = embedded.height * 0.75;
      doc.addPage([w, h]).drawImage(embedded, { x: 0, y: 0, width: w, height: h });
      continue;
    }
    const [pw, ph] = PAGE_SIZES[opts.pageSize];
    const landscape = embedded.width > embedded.height;
    const [W, H] = landscape ? [ph, pw] : [pw, ph];
    const boxW = W - opts.margin * 2;
    const boxH = H - opts.margin * 2;
    const scale = Math.min(boxW / embedded.width, boxH / embedded.height);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    doc.addPage([W, H]).drawImage(embedded, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });
  }
  return save(doc);
}

/**
 * Rebuilds a PDF from pre-rendered JPEG page images. Used for strong
 * compression: the caller renders each page at a reduced quality/size.
 */
export async function pdfFromPageImages(
  pages: { jpeg: Bytes; width: number; height: number }[]
): Promise<Bytes> {
  const doc = await PDFDocument.create();
  for (const p of pages) {
    const img = await doc.embedJpg(p.jpeg);
    doc.addPage([p.width, p.height]).drawImage(img, { x: 0, y: 0, width: p.width, height: p.height });
  }
  return save(doc);
}

/** Lossless re-save with object streams; drops unused objects. */
export async function optimize(bytes: Bytes): Promise<Bytes> {
  const src = await loadPdf(bytes);
  const out = await copyInto(src, src.getPageIndices());
  return save(out, true);
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

/**
 * A page's visible frame: its displayed size plus a mapping from visual
 * coordinates (origin bottom-left of what the reader sees) to user space.
 * Needed so stamps stay upright on pages that carry a /Rotate entry.
 */
type Frame = {
  width: number;
  height: number;
  rotation: number;
  toUser: (vx: number, vy: number) => { x: number; y: number };
};

function visualSize(page: PDFPage) {
  const { width, height } = page.getCropBox();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  return r === 90 || r === 270 ? { width: height, height: width } : { width, height };
}

function frameOf(page: PDFPage): Frame {
  const box = page.getCropBox();
  const W = box.width;
  const H = box.height;
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  const off = (x: number, y: number) => ({ x: x + box.x, y: y + box.y });
  switch (r) {
    case 90:
      return { width: H, height: W, rotation: 90, toUser: (vx, vy) => off(W - vy, vx) };
    case 180:
      return { width: W, height: H, rotation: 180, toUser: (vx, vy) => off(W - vx, H - vy) };
    case 270:
      return { width: H, height: W, rotation: 270, toUser: (vx, vy) => off(vy, H - vx) };
    default:
      return { width: W, height: H, rotation: 0, toUser: (vx, vy) => off(vx, vy) };
  }
}

/**
 * Draws `text` so its visual centre lands at (cx, cy) in the page's visual
 * frame, rotated by `angle` degrees counter-clockwise as the reader sees it.
 */
function drawCentered(
  page: PDFPage,
  frame: Frame,
  text: string,
  font: PDFFont,
  size: number,
  cx: number,
  cy: number,
  angle: number,
  color: { r: number; g: number; b: number },
  opacity: number
) {
  const w = font.widthOfTextAtSize(text, size);
  const h = font.heightAtSize(size, { descender: false });
  const t = (angle * Math.PI) / 180;
  // Bottom-left origin in visual space such that the box centre is (cx, cy).
  const vx = cx - (w / 2) * Math.cos(t) + (h / 2) * Math.sin(t);
  const vy = cy - (w / 2) * Math.sin(t) - (h / 2) * Math.cos(t);
  const { x, y } = frame.toUser(vx, vy);
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: rgb(color.r, color.g, color.b),
    opacity,
    rotate: degrees(angle + frame.rotation),
  });
}

/**
 * Standard fonts are WinAnsi only and pdf-lib silently prints "?" for other
 * characters, so fail early with a clear message instead.
 */
function assertEncodable(font: PDFFont, text: string) {
  const supported = new Set(font.getCharacterSet());
  const bad = [...text].find((ch) => ch.trim() && !supported.has(ch.codePointAt(0)!));
  if (bad) {
    throw new PdfToolError(t('Karakter "{char}" belum didukung. Gunakan huruf Latin.', { char: bad }));
  }
}

export function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0x888888;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export type WatermarkOptions = {
  text: string;
  fontSize: number;
  /** 0..1 */
  opacity: number;
  /** Degrees, counter-clockwise. */
  angle: number;
  color: string;
  tiled: boolean;
};

export async function addTextWatermark(bytes: Bytes, o: WatermarkOptions): Promise<Bytes> {
  const text = o.text.trim();
  if (!text) throw new PdfToolError(t('Isi teks watermark.'));
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  assertEncodable(font, text);
  const color = hexToRgb(o.color);
  for (const page of doc.getPages()) {
    const f = frameOf(page);
    if (!o.tiled) {
      drawCentered(page, f, text, font, o.fontSize, f.width / 2, f.height / 2, o.angle, color, o.opacity);
      continue;
    }
    const stepX = font.widthOfTextAtSize(text, o.fontSize) + o.fontSize * 2;
    const stepY = o.fontSize * 4;
    for (let y = stepY / 2; y < f.height + stepY; y += stepY) {
      const shift = (Math.round(y / stepY) % 2) * (stepX / 2);
      for (let x = -stepX / 2 + shift; x < f.width + stepX; x += stepX) {
        drawCentered(page, f, text, font, o.fontSize, x, y, o.angle, color, o.opacity);
      }
    }
  }
  return save(doc);
}

export type NumberPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left';

export type PageNumberOptions = {
  position: NumberPosition;
  /** Template; `{n}` is the page number and `{total}` the last number printed. */
  format: string;
  startAt: number;
  fontSize: number;
  margin: number;
  /** 0-based pages to number; all when omitted. */
  pages?: number[];
};

/** Label for each page (null = not numbered), e.g. ["1 / 2", null, "2 / 2"]. */
export function pageLabels(format: string, startAt: number, pageCount: number, pages?: number[]): (string | null)[] {
  const targets = new Set(pages ?? Array.from({ length: pageCount }, (_, i) => i));
  // The last number printed, so "{n} / {total}" stays consistent when pages are skipped.
  const total = startAt + targets.size - 1;
  let counter = startAt;
  return Array.from({ length: pageCount }, (_, i) =>
    targets.has(i) ? format.replace(/\{n\}/g, String(counter++)).replace(/\{total\}/g, String(total)) : null
  );
}

export async function addPageNumbers(bytes: Bytes, o: PageNumberOptions): Promise<Bytes> {
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const labels = pageLabels(o.format, o.startAt, doc.getPageCount(), o.pages);
  doc.getPages().forEach((page, i) => {
    const label = labels[i];
    if (label === null) return;
    assertEncodable(font, label);
    const f = frameOf(page);
    const w = font.widthOfTextAtSize(label, o.fontSize);
    const [vert, horiz] = o.position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];
    const cy = vert === 'top' ? f.height - o.margin - o.fontSize / 2 : o.margin + o.fontSize / 2;
    const cx = horiz === 'left' ? o.margin + w / 2 : horiz === 'right' ? f.width - o.margin - w / 2 : f.width / 2;
    drawCentered(page, f, label, font, o.fontSize, cx, cy, 0, { r: 0, g: 0, b: 0 }, 1);
  });
  return save(doc);
}

export async function flattenForm(bytes: Bytes): Promise<Bytes> {
  const doc = await loadPdf(bytes);
  const form = doc.getForm();
  if (form.getFields().length === 0) throw new PdfToolError(t('PDF ini tidak memiliki formulir.'));
  form.flatten();
  return save(doc);
}

/** Stamps a PNG/JPEG (e.g. a signature) onto one page at a visual position. */
export type StampOptions = {
  image: ImageInput;
  pageIndex: number;
  /** Visual position of the stamp's centre, as fractions (0..1) of the page. */
  cx: number;
  cy: number;
  /** Stamp width as a fraction of the page width. */
  widthFraction: number;
};

export async function stampImage(bytes: Bytes, o: StampOptions): Promise<Bytes> {
  const doc = await loadPdf(bytes);
  const img = o.image.kind === 'png' ? await doc.embedPng(o.image.bytes) : await doc.embedJpg(o.image.bytes);
  const page = doc.getPage(o.pageIndex);
  const f = frameOf(page);
  const w = f.width * o.widthFraction;
  const h = (img.height / img.width) * w;
  // Bottom-left corner in visual space, then rotate with the page.
  const cx = f.width * o.cx;
  const cy = f.height * (1 - o.cy);
  const vx = cx - w / 2;
  const vy = cy - h / 2;
  const { x, y } = f.toUser(vx, vy);
  page.drawImage(img, { x, y, width: w, height: h, rotate: degrees(f.rotation) });
  return save(doc);
}

export type Point = { x: number; y: number };

/** A hand-drawn signature, normalised to its own bounding box. */
export type DrawnPath = { d: string; width: number; height: number };

/**
 * Turns touch strokes into one SVG path cropped to the strokes' bounds.
 * Midpoint quadratic curves smooth the jitter of raw touch samples.
 */
export function strokesToPath(strokes: Point[][], padding = 4): DrawnPath | null {
  const pts = strokes.flat();
  if (pts.length === 0) return null;
  const minX = Math.min(...pts.map((p) => p.x)) - padding;
  const minY = Math.min(...pts.map((p) => p.y)) - padding;
  const maxX = Math.max(...pts.map((p) => p.x)) + padding;
  const maxY = Math.max(...pts.map((p) => p.y)) + padding;
  const f = (n: number) => Math.round(n * 10) / 10;
  const parts: string[] = [];
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    const p = stroke.map((q) => ({ x: q.x - minX, y: q.y - minY }));
    parts.push(`M${f(p[0].x)} ${f(p[0].y)}`);
    if (p.length === 1) {
      // A tap: draw a dot so it still shows up.
      parts.push(`L${f(p[0].x + 0.1)} ${f(p[0].y)}`);
      continue;
    }
    for (let i = 1; i < p.length - 1; i++) {
      const mx = (p[i].x + p[i + 1].x) / 2;
      const my = (p[i].y + p[i + 1].y) / 2;
      parts.push(`Q${f(p[i].x)} ${f(p[i].y)} ${f(mx)} ${f(my)}`);
    }
    const last = p[p.length - 1];
    parts.push(`L${f(last.x)} ${f(last.y)}`);
  }
  return { d: parts.join(' '), width: maxX - minX, height: maxY - minY };
}

export type PathStampOptions = {
  path: DrawnPath;
  /** Stroke width in path units (the drawing canvas's points). */
  strokeWidth: number;
  color: string;
  pageIndex: number;
  cx: number;
  cy: number;
  widthFraction: number;
};

/** Draws a signature as vector strokes, so it stays sharp at any zoom. */
export async function stampPath(bytes: Bytes, o: PathStampOptions): Promise<Bytes> {
  const doc = await loadPdf(bytes);
  const page = doc.getPage(o.pageIndex);
  const f = frameOf(page);
  const w = f.width * o.widthFraction;
  const scale = w / o.path.width;
  const h = o.path.height * scale;
  // drawSvgPath's origin is the path's top-left corner, with y pointing down.
  const { x, y } = f.toUser(f.width * o.cx - w / 2, f.height * (1 - o.cy) + h / 2);
  page.drawSvgPath(o.path.d, {
    x,
    y,
    scale,
    rotate: degrees(f.rotation),
    borderColor: rgb(...rgbTuple(o.color)),
    borderWidth: o.strokeWidth,
    borderLineCap: LineCapStyle.Round,
  });
  return save(doc);
}

function rgbTuple(hex: string): [number, number, number] {
  const c = hexToRgb(hex);
  return [c.r, c.g, c.b];
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export type ProtectOptions = {
  userPassword: string;
  ownerPassword?: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowModifying: boolean;
};

function randomPassword(): string {
  const buf = new Uint8Array(24);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function protect(bytes: Bytes, o: ProtectOptions): Promise<Bytes> {
  if (!o.userPassword) throw new PdfToolError(t('Isi password.'));
  const doc = await loadPdf(bytes);
  const options: SecurityOptions = {
    userPassword: o.userPassword,
    // Opening with the owner password ignores permissions, so it must differ
    // from the user password or the restrictions would be meaningless.
    ownerPassword: o.ownerPassword || randomPassword(),
    permissions: {
      printing: o.allowPrinting ? 'highResolution' : false,
      copying: o.allowCopying,
      modifying: o.allowModifying,
      annotating: o.allowModifying,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: o.allowModifying,
    },
  };
  doc.encrypt(options);
  return save(doc, false);
}

export async function unlock(bytes: Bytes, password: string): Promise<Bytes> {
  const doc = await loadPdf(bytes, password);
  // Copying pages into a fresh document guarantees no /Encrypt survives.
  return save(await copyInto(doc, doc.getPageIndices()));
}
