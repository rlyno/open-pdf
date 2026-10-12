import { useEffect, useState } from 'react';

import { baseName, pickPdfs, readBytes, saveOutput, type OutputFile, type PickedFile } from '@/lib/files';
import { t } from '@/lib/i18n';
import { PdfToolError, getInfo, type PdfInfo } from '@/lib/pdf/ops';
import { canRender, renderPage } from '@/lib/render';

export type PdfSource = PickedFile & { info: PdfInfo };

/** Files handed to a tool up front, e.g. shared into the app from elsewhere. */
export type ToolProps = { initial?: PickedFile[] };

/**
 * Picks one PDF and reads its page count, sizes and encryption state.
 * `initial` (if given) is opened straight away instead of waiting for a pick.
 */
export function usePdfSource(initial?: PickedFile) {
  const [source, setSource] = useState<PdfSource | null>(null);
  const [loading, setLoading] = useState(!!initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) return;
    let active = true;
    readBytes(initial.uri)
      .then(getInfo)
      .then(
        (info) => active && setSource({ ...initial, info }),
        (e) => active && setError(messageOf(e))
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [initial]);

  async function pick() {
    setError(null);
    const [file] = await pickPdfs(false);
    if (!file) return;
    setLoading(true);
    try {
      const info = await getInfo(await readBytes(file.uri));
      setSource({ ...file, info });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }

  return { source, pick, loading, error, clear: () => setSource(null) };
}

export type ToolOutput = { name: string; bytes: Uint8Array };

/** Runs a tool, saves its outputs to the app's file list, and tracks state. */
export function useToolRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OutputFile[]>([]);

  async function run(task: () => Promise<ToolOutput[]>) {
    setBusy(true);
    setError(null);
    setResults([]);
    // Let the spinner paint before pdf-lib occupies the JS thread.
    await new Promise((r) => setTimeout(r, 60));
    try {
      const outputs = await task();
      setResults(outputs.map((o) => saveOutput(o.name, o.bytes)));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, results, run, reset: () => setResults([]) };
}

export function messageOf(e: unknown) {
  if (e instanceof PdfToolError) return e.message;
  const msg = (e as Error)?.message ?? String(e);
  return t('Terjadi kesalahan: {msg}', { msg });
}

/**
 * Output name derived from the source, e.g. "laporan-diputar.pdf". `suffix`
 * is translated, so English users get "laporan-rotated.pdf".
 */
export function outName(source: { name: string }, suffix: string, ext = 'pdf') {
  return `${baseName(source.name)}-${t(suffix)}.${ext}`;
}

const thumbCache = new Map<string, string>();

/**
 * Renders page thumbnails one at a time so the first pages appear quickly
 * and large documents don't flood the native renderer.
 */
export function usePageThumbs(uri: string | undefined, pageCount: number, maxWidth = 280) {
  // Keyed by uri + page, so switching documents needs no reset.
  const [rendered, setRendered] = useState<Record<string, string>>({});
  const keyOf = (i: number) => `${uri}#${i}@${maxWidth}`;

  useEffect(() => {
    if (!uri || !canRender()) return;
    let active = true;
    (async () => {
      for (let i = 0; i < pageCount && active; i++) {
        const key = `${uri}#${i}@${maxWidth}`;
        let thumb = thumbCache.get(key);
        if (!thumb) {
          try {
            thumb = (await renderPage(uri, i, { maxWidth, maxHeight: maxWidth * 1.6, quality: 70 })).uri;
            thumbCache.set(key, thumb);
          } catch {
            // Leave the placeholder; the page number is still shown.
            continue;
          }
        }
        const value = thumb;
        if (active) setRendered((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
      }
    })();
    return () => {
      active = false;
    };
  }, [uri, pageCount, maxWidth]);

  return Array.from({ length: pageCount }, (_, i) => rendered[keyOf(i)]);
}
