import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export type CategoryId = 'organize' | 'convert' | 'edit' | 'security';

export type ToolId =
  | 'merge'
  | 'split'
  | 'organize'
  | 'rotate'
  | 'remove-pages'
  | 'n-up'
  | 'images-to-pdf'
  | 'pdf-to-images'
  | 'compress'
  | 'watermark'
  | 'page-numbers'
  | 'sign'
  | 'metadata'
  | 'flatten'
  | 'protect'
  | 'unlock';

/** What a tool consumes, used to offer tools for files shared into the app. */
export type ToolInput = 'pdf' | 'pdfs' | 'images';

export type ToolDef = {
  id: ToolId;
  input: ToolInput;
  title: string;
  description: string;
  category: CategoryId;
  icon: { ios: SFSymbol; android: AndroidSymbol };
  keywords?: string;
};

export const CATEGORIES: { id: CategoryId; title: string; color: string }[] = [
  { id: 'organize', title: 'Atur', color: '#2F6FEB' },
  { id: 'convert', title: 'Konversi', color: '#1A9A6C' },
  { id: 'edit', title: 'Edit', color: '#D97706' },
  { id: 'security', title: 'Keamanan', color: '#D93A3A' },
];

export const TOOLS: ToolDef[] = [
  {
    id: 'merge',
    input: 'pdfs',
    title: 'Gabung PDF',
    description: 'Satukan beberapa PDF menjadi satu file',
    category: 'organize',
    icon: { ios: 'square.stack.3d.down.right', android: 'call_merge' },
    keywords: 'merge combine join',
  },
  {
    id: 'split',
    input: 'pdf',
    title: 'Pisah PDF',
    description: 'Pecah PDF per rentang atau tiap N halaman',
    category: 'organize',
    icon: { ios: 'scissors', android: 'content_cut' },
    keywords: 'split separate',
  },
  {
    id: 'organize',
    input: 'pdf',
    title: 'Atur Halaman',
    description: 'Urutkan, ambil, atau duplikat halaman',
    category: 'organize',
    icon: { ios: 'square.grid.2x2', android: 'grid_view' },
    keywords: 'reorder extract sort move',
  },
  {
    id: 'rotate',
    input: 'pdf',
    title: 'Putar Halaman',
    description: 'Putar semua atau sebagian halaman',
    category: 'organize',
    icon: { ios: 'rotate.right', android: 'rotate_right' },
    keywords: 'rotate',
  },
  {
    id: 'remove-pages',
    input: 'pdf',
    title: 'Hapus Halaman',
    description: 'Buang halaman yang tidak diperlukan',
    category: 'organize',
    icon: { ios: 'trash', android: 'delete' },
    keywords: 'delete remove',
  },
  {
    id: 'n-up',
    input: 'pdf',
    title: 'Multi-Halaman',
    description: 'Cetak 2 atau 4 halaman per lembar',
    category: 'organize',
    icon: { ios: 'rectangle.split.2x2', android: 'view_module' },
    keywords: 'n-up layout booklet',
  },
  {
    id: 'images-to-pdf',
    input: 'images',
    title: 'Gambar ke PDF',
    description: 'Ubah foto atau scan menjadi PDF',
    category: 'convert',
    icon: { ios: 'photo.on.rectangle', android: 'image' },
    keywords: 'image jpg png photo scan',
  },
  {
    id: 'pdf-to-images',
    input: 'pdf',
    title: 'PDF ke Gambar',
    description: 'Ekspor halaman menjadi JPEG',
    category: 'convert',
    icon: { ios: 'photo.stack', android: 'photo_library' },
    keywords: 'image jpg export',
  },
  {
    id: 'compress',
    input: 'pdf',
    title: 'Kompres PDF',
    description: 'Perkecil ukuran file',
    category: 'convert',
    icon: { ios: 'arrow.down.right.and.arrow.up.left', android: 'compress' },
    keywords: 'compress optimize reduce size',
  },
  {
    id: 'watermark',
    input: 'pdf',
    title: 'Watermark',
    description: 'Tambahkan teks watermark',
    category: 'edit',
    icon: { ios: 'drop', android: 'water_drop' },
    keywords: 'stamp watermark',
  },
  {
    id: 'page-numbers',
    input: 'pdf',
    title: 'Nomor Halaman',
    description: 'Beri nomor di setiap halaman',
    category: 'edit',
    icon: { ios: 'number', android: 'format_list_numbered' },
    keywords: 'page numbers',
  },
  {
    id: 'sign',
    input: 'pdf',
    title: 'Tanda Tangan / Gambar',
    description: 'Tempel tanda tangan atau stempel',
    category: 'edit',
    icon: { ios: 'signature', android: 'draw' },
    keywords: 'sign signature stamp image',
  },
  {
    id: 'metadata',
    input: 'pdf',
    title: 'Info & Metadata',
    description: 'Lihat dan ubah judul, penulis, dll.',
    category: 'edit',
    icon: { ios: 'info.circle', android: 'info' },
    keywords: 'metadata properties info title author',
  },
  {
    id: 'flatten',
    input: 'pdf',
    title: 'Ratakan Formulir',
    description: 'Kunci isian formulir agar tidak bisa diubah',
    category: 'edit',
    icon: { ios: 'square.3.layers.3d.down.right', android: 'layers' },
    keywords: 'flatten form',
  },
  {
    id: 'protect',
    input: 'pdf',
    title: 'Tambah Password',
    description: 'Enkripsi PDF dengan AES-256',
    category: 'security',
    icon: { ios: 'lock', android: 'lock' },
    keywords: 'password encrypt protect',
  },
  {
    id: 'unlock',
    input: 'pdf',
    title: 'Hapus Password',
    description: 'Buka PDF terkunci (butuh password)',
    category: 'security',
    icon: { ios: 'lock.open', android: 'lock_open' },
    keywords: 'unlock decrypt remove password',
  },
];

export function toolsFor(input: ToolInput): ToolDef[] {
  return TOOLS.filter((t) => t.input === input);
}

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function categoryColor(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!.color;
}
