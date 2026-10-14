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
  | 'fill-form'
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
  /** Short capability tag shown on the tool card. */
  badge: string;
  badgeTone?: 'accent' | 'neutral' | 'danger';
  /** One-line detail under the description. */
  feature: string;
  /** Shown in the File hub's quick tools. */
  quick?: boolean;
  keywords?: string;
};

export const CATEGORIES: { id: CategoryId; title: string; color: string }[] = [
  { id: 'organize', title: 'Atur', color: '#818CF8' },
  { id: 'convert', title: 'Konversi', color: '#38BDF8' },
  { id: 'edit', title: 'Edit', color: '#F59E0B' },
  { id: 'security', title: 'Keamanan', color: '#F87171' },
];

export const TOOLS: ToolDef[] = [
  {
    id: 'merge',
    input: 'pdfs',
    title: 'Gabung PDF',
    description: 'Satukan beberapa PDF menjadi satu file',
    category: 'organize',
    icon: { ios: 'square.stack.3d.down.right', android: 'call_merge' },
    badge: 'Banyak file',
    feature: 'Atur urutan sebelum digabung',
    quick: true,
    keywords: 'merge combine join',
  },
  {
    id: 'split',
    input: 'pdf',
    title: 'Pisah PDF',
    description: 'Pecah PDF per rentang atau tiap N halaman',
    category: 'organize',
    icon: { ios: 'scissors', android: 'content_cut' },
    badge: 'Rentang',
    feature: 'Mendukung sintaks 1-3, 5, 8-',
    keywords: 'split separate',
  },
  {
    id: 'organize',
    input: 'pdf',
    title: 'Atur Halaman',
    description: 'Urutkan, ambil, atau duplikat halaman',
    category: 'organize',
    icon: { ios: 'square.grid.2x2', android: 'grid_view' },
    badge: 'Visual',
    feature: 'Ketuk halaman untuk menyusun urutan baru',
    keywords: 'reorder extract sort move',
  },
  {
    id: 'rotate',
    input: 'pdf',
    title: 'Putar Halaman',
    description: 'Putar semua atau sebagian halaman',
    category: 'organize',
    icon: { ios: 'rotate.right', android: 'rotate_right' },
    badge: '90° · 180°',
    badgeTone: 'neutral',
    feature: 'Semua halaman atau pilih sendiri',
    keywords: 'rotate',
  },
  {
    id: 'remove-pages',
    input: 'pdf',
    title: 'Hapus Halaman',
    description: 'Buang halaman yang tidak diperlukan',
    category: 'organize',
    icon: { ios: 'trash', android: 'delete' },
    badge: 'Pratinjau',
    badgeTone: 'neutral',
    feature: 'Pilih langsung dari thumbnail',
    keywords: 'delete remove',
  },
  {
    id: 'n-up',
    input: 'pdf',
    title: 'Multi-Halaman',
    description: 'Cetak 2 atau 4 halaman per lembar',
    category: 'organize',
    icon: { ios: 'rectangle.split.2x2', android: 'view_module' },
    badge: 'A4',
    badgeTone: 'neutral',
    feature: 'Hemat kertas saat mencetak',
    keywords: 'n-up layout booklet',
  },
  {
    id: 'images-to-pdf',
    input: 'images',
    title: 'Gambar ke PDF',
    description: 'Ubah foto atau scan menjadi PDF',
    category: 'convert',
    icon: { ios: 'photo.on.rectangle', android: 'image' },
    badge: 'JPG · PNG · HEIC',
    feature: 'Ukuran A4, Letter, atau sesuai gambar',
    quick: true,
    keywords: 'image jpg png photo scan',
  },
  {
    id: 'pdf-to-images',
    input: 'pdf',
    title: 'PDF ke Gambar',
    description: 'Ekspor halaman menjadi JPEG',
    category: 'convert',
    icon: { ios: 'photo.stack', android: 'photo_library' },
    badge: 'Hingga 300 dpi',
    feature: 'Banyak halaman dikemas jadi ZIP',
    keywords: 'image jpg export',
  },
  {
    id: 'compress',
    input: 'pdf',
    title: 'Kompres PDF',
    description: 'Perkecil ukuran file',
    category: 'convert',
    icon: { ios: 'arrow.down.right.and.arrow.up.left', android: 'compress' },
    badge: '2 metode',
    feature: 'Tanpa kehilangan atau maksimal',
    quick: true,
    keywords: 'compress optimize reduce size',
  },
  {
    id: 'watermark',
    input: 'pdf',
    title: 'Watermark',
    description: 'Tambahkan teks watermark',
    category: 'edit',
    icon: { ios: 'drop', android: 'water_drop' },
    badge: 'Teks',
    badgeTone: 'neutral',
    feature: 'Di tengah atau diulang',
    keywords: 'stamp watermark',
  },
  {
    id: 'page-numbers',
    input: 'pdf',
    title: 'Nomor Halaman',
    description: 'Beri nomor di setiap halaman',
    category: 'edit',
    icon: { ios: 'number', android: 'format_list_numbered' },
    badge: '6 posisi',
    badgeTone: 'neutral',
    feature: 'Format "Halaman 1 dari N"',
    keywords: 'page numbers',
  },
  {
    id: 'sign',
    input: 'pdf',
    title: 'Tanda Tangan / Gambar',
    description: 'Tempel tanda tangan atau stempel',
    category: 'edit',
    icon: { ios: 'signature', android: 'draw' },
    badge: 'Vektor',
    feature: 'Gambar dengan jari atau dari foto',
    quick: true,
    keywords: 'sign signature stamp image',
  },
  {
    id: 'metadata',
    input: 'pdf',
    title: 'Info & Metadata',
    description: 'Lihat dan ubah judul, penulis, dll.',
    category: 'edit',
    icon: { ios: 'info.circle', android: 'info' },
    badge: 'Edit',
    badgeTone: 'neutral',
    feature: 'Judul, penulis, kata kunci',
    keywords: 'metadata properties info title author',
  },
  {
    id: 'fill-form',
    input: 'pdf',
    title: 'Isi Formulir',
    description: 'Isi kolom formulir PDF langsung di HP',
    category: 'edit',
    icon: { ios: 'list.bullet.rectangle', android: 'assignment' },
    badge: 'Formulir',
    feature: 'Teks, kotak centang, dan pilihan',
    keywords: 'fill form field acroform isi',
  },
  {
    id: 'flatten',
    input: 'pdf',
    title: 'Ratakan Formulir',
    description: 'Kunci isian formulir agar tidak bisa diubah',
    category: 'edit',
    icon: { ios: 'square.3.layers.3d.down.right', android: 'layers' },
    badge: 'Permanen',
    badgeTone: 'danger',
    feature: 'Isian formulir jadi bagian halaman',
    keywords: 'flatten form',
  },
  {
    id: 'protect',
    input: 'pdf',
    title: 'Tambah Password',
    description: 'Enkripsi PDF dengan AES-256',
    category: 'security',
    icon: { ios: 'lock', android: 'lock' },
    badge: 'AES-256',
    feature: 'Atur izin cetak dan salin',
    keywords: 'password encrypt protect',
  },
  {
    id: 'unlock',
    input: 'pdf',
    title: 'Hapus Password',
    description: 'Buka PDF terkunci (butuh password)',
    category: 'security',
    icon: { ios: 'lock.open', android: 'lock_open' },
    badge: 'Butuh password',
    badgeTone: 'neutral',
    feature: 'Hapus enkripsi dari PDF milikmu',
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
