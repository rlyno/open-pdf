import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { PDFDocument, StandardFonts, degrees } from '@cantoo/pdf-lib';

import * as ops from '../src/lib/pdf/ops';

const OUT = join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });
const dump = (name: string, bytes: Uint8Array) => writeFileSync(join(OUT, name), bytes);

/** Builds a PDF whose page i is labelled "Page i+1" and is (200+i) points wide. */
async function makePdf(pages: number, opts: { rotateFirst?: number; form?: boolean } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([200 + i, 300]);
    page.drawText(`Page ${i + 1}`, { x: 20, y: 150, size: 24, font });
  }
  if (opts.rotateFirst) doc.getPage(0).setRotation(degrees(opts.rotateFirst));
  if (opts.form) {
    const field = doc.getForm().createTextField('name');
    field.setText('Ada');
    field.addToPage(doc.getPage(0), { x: 20, y: 40, width: 150, height: 24 });
  }
  return doc.save();
}

const widths = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((p) => Math.round(p.getWidth()));

// 1x1 red PNG and a 1x1 JPEG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);
const JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

describe('parsePageRanges', () => {
  it('parses ranges, singles, open ends and reverse ranges', () => {
    assert.deepEqual(ops.parsePageRanges('1-3,5', 6), [0, 1, 2, 4]);
    assert.deepEqual(ops.parsePageRanges('5-', 6), [4, 5]);
    assert.deepEqual(ops.parsePageRanges('-2', 6), [0, 1]);
    assert.deepEqual(ops.parsePageRanges('3-1', 6), [2, 1, 0]);
    assert.deepEqual(ops.parsePageRanges(' 2 , 2 ', 6), [1, 1]);
  });
  it('rejects out of range and garbage', () => {
    assert.throws(() => ops.parsePageRanges('7', 6), ops.PdfToolError);
    assert.throws(() => ops.parsePageRanges('0', 6), ops.PdfToolError);
    assert.throws(() => ops.parsePageRanges('a-b', 6), ops.PdfToolError);
    assert.throws(() => ops.parsePageRanges('', 6), ops.PdfToolError);
  });
  it('groups by comma', () => {
    assert.deepEqual(ops.parseRangeGroups('1-2, 4-5', 6), [[0, 1], [3, 4]]);
  });
});

describe('organize', () => {
  it('merges in order', async () => {
    const out = await ops.merge([await makePdf(2), await makePdf(3)]);
    assert.deepEqual(await widths(out), [200, 201, 200, 201, 202]);
    dump('merge.pdf', out);
  });
  it('requires two files to merge', async () => {
    await assert.rejects(ops.merge([await makePdf(1)]), ops.PdfToolError);
  });
  it('selects and reorders pages', async () => {
    const out = await ops.selectPages(await makePdf(4), [3, 0, 0]);
    assert.deepEqual(await widths(out), [203, 200, 200]);
  });
  it('removes pages', async () => {
    const out = await ops.removePages(await makePdf(4), [1, 2]);
    assert.deepEqual(await widths(out), [200, 203]);
    await assert.rejects(ops.removePages(await makePdf(2), [0, 1]), ops.PdfToolError);
  });
  it('splits every n and by groups', async () => {
    const src = await makePdf(5);
    const parts = await ops.splitEvery(src, 2);
    assert.equal(parts.length, 3);
    assert.deepEqual(await widths(parts[2]), [204]);
    const groups = await ops.splitIntoGroups(src, ops.parseRangeGroups('1-2,5', 5));
    assert.deepEqual(await Promise.all(groups.map(widths)), [[200, 201], [204]]);
  });
  it('rotates selected pages cumulatively', async () => {
    const once = await ops.rotate(await makePdf(3), 90, [0, 2]);
    const twice = await ops.rotate(once, 270, [0]);
    const doc = await PDFDocument.load(twice);
    assert.deepEqual(
      doc.getPages().map((p) => p.getRotation().angle),
      [0, 0, 90]
    );
  });
  it('n-up packs pages onto sheets', async () => {
    const out2 = await ops.nUp(await makePdf(5), 2);
    assert.equal((await PDFDocument.load(out2)).getPageCount(), 3);
    const out4 = await ops.nUp(await makePdf(5), 4);
    assert.equal((await PDFDocument.load(out4)).getPageCount(), 2);
    dump('nup4.pdf', out4);
  });
});

describe('convert', () => {
  it('builds a PDF from images', async () => {
    const out = await ops.imagesToPdf(
      [
        { bytes: PNG, kind: 'png' },
        { bytes: JPG, kind: 'jpg' },
      ],
      { pageSize: 'A4', margin: 20 }
    );
    const doc = await PDFDocument.load(out);
    assert.equal(doc.getPageCount(), 2);
    assert.equal(Math.round(doc.getPage(0).getWidth()), 595);
    const fit = await ops.imagesToPdf([{ bytes: PNG, kind: 'png' }], { pageSize: 'fit', margin: 0 });
    assert.equal((await PDFDocument.load(fit)).getPage(0).getWidth(), 0.75);
  });
  it('rebuilds a PDF from page images', async () => {
    const out = await ops.pdfFromPageImages([{ jpeg: JPG, width: 100, height: 150 }]);
    const doc = await PDFDocument.load(out);
    assert.deepEqual(doc.getPage(0).getSize(), { width: 100, height: 150 });
  });
  it('optimizes without losing pages', async () => {
    const out = await ops.optimize(await makePdf(3));
    assert.equal((await PDFDocument.load(out)).getPageCount(), 3);
  });
});

describe('edit', () => {
  it('adds watermark (centred and tiled), including on rotated pages', async () => {
    const src = await makePdf(2, { rotateFirst: 90 });
    const base = { text: 'CONFIDENTIAL', fontSize: 40, opacity: 0.3, angle: 45, color: '#ff0000' };
    const a = await ops.addTextWatermark(src, { ...base, tiled: false });
    const b = await ops.addTextWatermark(src, { ...base, tiled: true });
    assert.ok(b.length > a.length);
    dump('watermark.pdf', a);
    dump('watermark-tiled.pdf', b);
    await assert.rejects(ops.addTextWatermark(src, { ...base, text: '  ', tiled: false }), ops.PdfToolError);
    await assert.rejects(ops.addTextWatermark(src, { ...base, text: '机密', tiled: false }), ops.PdfToolError);
  });
  it('adds page numbers', async () => {
    const out = await ops.addPageNumbers(await makePdf(3, { rotateFirst: 270 }), {
      position: 'bottom-right',
      format: '{n} / {total}',
      startAt: 1,
      fontSize: 12,
      margin: 24,
    });
    dump('numbers.pdf', out);
    assert.equal((await PDFDocument.load(out)).getPageCount(), 3);
  });
  it('reads and writes metadata', async () => {
    const out = await ops.setMetadata(await makePdf(1), { title: 'Laporan', author: 'Budi', keywords: 'a, b' });
    const info = await ops.getInfo(out);
    assert.equal(info.title, 'Laporan');
    assert.equal(info.author, 'Budi');
    assert.equal(info.keywords, 'a b');
    assert.equal(info.pageCount, 1);
    assert.equal(info.encrypted, false);
    assert.equal(info.producer, ops.PRODUCER);
  });
  it('reports visual page sizes', async () => {
    const info = await ops.getInfo(await makePdf(2, { rotateFirst: 90 }));
    assert.deepEqual(info.pageSizes[0], { width: 300, height: 200 });
    assert.deepEqual(info.pageSizes[1], { width: 201, height: 300 });
  });
  it('flattens forms', async () => {
    const src = await makePdf(1, { form: true });
    assert.equal((await ops.getInfo(src)).hasForm, true);
    const out = await ops.flattenForm(src);
    assert.equal((await ops.getInfo(out)).hasForm, false);
    await assert.rejects(ops.flattenForm(await makePdf(1)), ops.PdfToolError);
  });
  it('lists and fills form fields', async () => {
    const doc = await PDFDocument.create();
    const [p1, p2] = [doc.addPage([300, 400]), doc.addPage([300, 400])];
    const form = doc.getForm();
    const add = <T extends { addToPage: (p: typeof p1, o: object) => void }>(f: T, page: typeof p1, y: number) => {
      f.addToPage(page, { x: 20, y, width: 120, height: 20 });
      return f;
    };
    add(form.createTextField('nama'), p1, 340);
    add(form.createCheckBox('setuju'), p1, 200);
    const alamat = add(form.createTextField('alamat'), p1, 300);
    alamat.enableMultiline();
    // Auto font size, as Acrobat-made forms usually have.
    alamat.acroField.setDefaultAppearance('0 0 0 rg\n/Helvetica 0 Tf');
    const kota = add(form.createDropdown('kota'), p2, 300);
    kota.addOptions(['Jakarta', 'Bandung']);
    const radio = form.createRadioGroup('jenis');
    radio.addOptionToPage('L', p2, { x: 20, y: 200, width: 15, height: 15 });
    radio.addOptionToPage('P', p2, { x: 60, y: 200, width: 15, height: 15 });
    const locked = add(form.createTextField('nomor'), p2, 100);
    locked.setText('A-1');
    locked.enableReadOnly();
    // Keep the auto size: saving with appearance updates would bake one in.
    const src = await doc.save({ updateFieldAppearances: false });

    const fields = await ops.getFormFields(src);
    assert.deepEqual(
      fields.map((f) => [f.name, f.kind, f.page]),
      [
        ['nama', 'text', 0],
        ['alamat', 'text', 0],
        ['setuju', 'checkbox', 0],
        ['kota', 'choice', 1],
        ['jenis', 'choice', 1],
        ['nomor', 'text', 1],
      ]
    );
    assert.deepEqual(fields.find((f) => f.name === 'jenis')!.kind === 'choice' && fields.find((f) => f.name === 'jenis'), {
      kind: 'choice', name: 'jenis', page: 1, value: '', options: ['L', 'P'], readOnly: false,
    });

    const out = await ops.fillForm(src, { nama: 'Budi', alamat: 'Jl. Merdeka 1\nBandung', setuju: true, kota: 'Bandung', jenis: 'P', nomor: 'X', lain: 'abaikan' });
    dump('form-filled.pdf', out);
    const values = Object.fromEntries((await ops.getFormFields(out)).map((f) => [f.name, f.value]));
    assert.deepEqual(values, { nama: 'Budi', alamat: 'Jl. Merdeka 1\nBandung', setuju: true, kota: 'Bandung', jenis: 'P', nomor: 'A-1' });

    const cleared = await ops.fillForm(out, { nama: '', setuju: false, kota: '' });
    const after = Object.fromEntries((await ops.getFormFields(cleared)).map((f) => [f.name, f.value]));
    assert.equal(after.nama, '');
    assert.equal(after.setuju, false);
    assert.equal(after.kota, '');

    // Auto-sized multiline fields get a regular size instead of pdf-lib's oversized pick.
    const da = (await PDFDocument.load(out)).getForm().getTextField('alamat').acroField.getDefaultAppearance();
    assert.match(da ?? '', /\b12 Tf/);

    const flat = await ops.fillForm(src, { nama: 'Budi' }, { flatten: true });
    assert.equal((await ops.getInfo(flat)).hasForm, false);
    await assert.rejects(ops.fillForm(src, { nama: 'Ахмед' }), ops.PdfToolError);
  });
  it('stamps an image', async () => {
    const out = await ops.stampImage(await makePdf(2, { rotateFirst: 90 }), {
      image: { bytes: PNG, kind: 'png' },
      pageIndex: 0,
      cx: 0.5,
      cy: 0.8,
      widthFraction: 0.3,
    });
    dump('stamp.pdf', out);
    assert.equal((await PDFDocument.load(out)).getPageCount(), 2);
  });
});

describe('security', () => {
  it('protects and unlocks', async () => {
    const locked = await ops.protect(await makePdf(2), {
      userPassword: 'rahasia',
      allowPrinting: true,
      allowCopying: false,
      allowModifying: false,
    });
    dump('locked.pdf', locked);
    const info = await ops.getInfo(locked);
    assert.equal(info.encrypted, true);
    await assert.rejects(ops.rotate(locked, 90), ops.PdfToolError);
    await assert.rejects(ops.unlock(locked, 'salah'), ops.PdfToolError);
    const open = await ops.unlock(locked, 'rahasia');
    dump('unlocked.pdf', open);
    const doc = await PDFDocument.load(open);
    assert.equal(doc.isEncrypted, false);
    assert.equal(doc.getPageCount(), 2);
  });
});

describe('pageLabels', () => {
  it('numbers all pages', () => {
    assert.deepEqual(ops.pageLabels('{n} / {total}', 1, 3), ['1 / 3', '2 / 3', '3 / 3']);
  });
  it('counts only numbered pages in {total} when skipping the cover', () => {
    assert.deepEqual(ops.pageLabels('Halaman {n} dari {total}', 1, 3, [1, 2]), [
      null,
      'Halaman 1 dari 2',
      'Halaman 2 dari 2',
    ]);
  });
  it('honours a custom start number', () => {
    assert.deepEqual(ops.pageLabels('{n}', 5, 2), ['5', '6']);
  });
});

describe('drawn signatures', () => {
  it('crops strokes to their bounds and smooths them', () => {
    const path = ops.strokesToPath(
      [
        [
          { x: 10, y: 10 },
          { x: 20, y: 30 },
          { x: 40, y: 20 },
        ],
        [{ x: 50, y: 50 }],
      ],
      0
    )!;
    assert.equal(path.width, 40);
    assert.equal(path.height, 40);
    assert.match(path.d, /^M0 0 Q10 20 20 15 L30 10 M40 40 L40.1 40$/);
    assert.equal(ops.strokesToPath([]), null);
  });
  it('stamps a vector signature, also on rotated pages', async () => {
    const path = ops.strokesToPath([
      [
        { x: 0, y: 40 },
        { x: 30, y: 0 },
        { x: 60, y: 40 },
        { x: 90, y: 0 },
      ],
    ])!;
    const opts = { path, strokeWidth: 3, color: '#1a3399', cx: 0.5, cy: 0.5, widthFraction: 0.4 };
    const src = await makePdf(2, { rotateFirst: 90 });
    const out = await ops.stampPath(src, { ...opts, pageIndex: 0 });
    dump('signature-drawn.pdf', out);
    dump('signature-drawn-upright.pdf', await ops.stampPath(src, { ...opts, pageIndex: 1 }));
    assert.equal((await PDFDocument.load(out)).getPageCount(), 2);
  });
});

describe('annotate', () => {
  const wave = Array.from({ length: 20 }, (_, i) => ({ x: 0.1 + i * 0.04, y: 0.5 + 0.05 * Math.sin(i / 2) }));
  const items: ops.Annotation[] = [
    { kind: 'ink', page: 0, points: wave, color: '#2563EB', width: 0.01 },
    { kind: 'ink', page: 0, points: [{ x: 0.1, y: 0.3 }, { x: 0.8, y: 0.3 }], color: '#FDE047', width: 0.04, marker: true },
    { kind: 'text', page: 0, x: 0.1, y: 0.1, text: 'Catatan\nbaris kedua', size: 0.05, color: '#DC2626' },
    { kind: 'text', page: 1, x: 0.1, y: 0.1, text: 'Halaman 2', size: 0.05, color: '#111111' },
  ];

  it('stamps ink, highlighter and text, also on rotated pages', async () => {
    const out = await ops.annotate(await makePdf(2, { rotateFirst: 90 }), items);
    dump('annotated.pdf', out);
    const doc = await PDFDocument.load(out);
    assert.equal(doc.getPageCount(), 2);
    assert.ok(out.length > (await makePdf(2)).length);
  });

  it('rejects an empty list and unsupported characters', async () => {
    const src = await makePdf(1);
    await assert.rejects(ops.annotate(src, []), ops.PdfToolError);
    await assert.rejects(
      ops.annotate(src, [{ kind: 'text', page: 0, x: 0, y: 0, text: '注释', size: 0.05, color: '#000000' }]),
      ops.PdfToolError
    );
  });

  it('ignores annotations for pages that do not exist', async () => {
    const out = await ops.annotate(await makePdf(1), [{ ...items[0], page: 5 }]);
    assert.equal((await PDFDocument.load(out)).getPageCount(), 1);
  });

  it('smooths a path the same way for preview and PDF', () => {
    assert.equal(ops.smoothPath([[{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 30, y: 10 }]]), 'M0 0 Q10 20 20 15 L30 10');
  });
});
