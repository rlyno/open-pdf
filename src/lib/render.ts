/**
 * Page rendering via the native PDF engines (PDFKit on iOS, PdfRenderer on
 * Android). The module is absent in Expo Go, so it is loaded lazily and
 * callers fall back to page-number placeholders when it is unavailable.
 *
 * patches/react-native-pdf-thumbnail+*.patch makes maxWidth/maxHeight scale
 * the page to fit (upscaling included) instead of only capping it at 72 dpi,
 * which is what lets "PDF to images" and compression choose a resolution.
 */
import type { GenerateOptions, ThumbnailResult } from 'react-native-pdf-thumbnail';

type Engine = {
  generate(path: string, page: number, opts?: GenerateOptions): Promise<ThumbnailResult>;
};

let engine: Engine | null | undefined;

function getEngine(): Engine | null {
  if (engine === undefined) {
    try {
      // Lazy on purpose: importing a missing TurboModule throws at load time.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      engine = require('react-native-pdf-thumbnail').default as Engine;
    } catch {
      engine = null;
    }
  }
  return engine;
}

export function canRender() {
  return getEngine() !== null;
}

export async function renderPage(uri: string, page: number, opts: GenerateOptions): Promise<ThumbnailResult> {
  const e = getEngine();
  if (!e) throw new Error('Render halaman membutuhkan development build (tidak tersedia di Expo Go).');
  return e.generate(uri, page, opts);
}
