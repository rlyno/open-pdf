import { useCallback, useEffect, useRef, useState } from 'react';

import { canRender, renderPage } from '@/lib/render';

const cache = new Map<string, string>();

/**
 * Full-size page renders for the viewer, produced on demand. Callers
 * `request` the pages they are about to show; requests are rendered one at a
 * time, newest first, and stale ones are dropped so fast scrolling through a
 * long document doesn't build an unbounded backlog.
 */
export function usePageImages(uri: string | undefined, maxWidth: number) {
  const [rendered, setRendered] = useState<Record<string, string>>({});
  const queue = useRef<number[]>([]);
  const running = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const keyOf = useCallback((i: number) => `${uri}#${i}@${maxWidth}`, [uri, maxWidth]);

  const publish = useCallback((key: string, value: string) => {
    if (alive.current) setRendered((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const pump = useCallback(async () => {
    if (running.current || !uri) return;
    running.current = true;
    while (queue.current.length && alive.current) {
      const i = queue.current.shift()!;
      const key = keyOf(i);
      let image = cache.get(key);
      if (!image) {
        try {
          image = (await renderPage(uri, i, { maxWidth, maxHeight: maxWidth * 2, quality: 85 })).uri;
          cache.set(key, image);
        } catch {
          continue;
        }
      }
      publish(key, image);
    }
    running.current = false;
  }, [uri, maxWidth, keyOf, publish]);

  const request = useCallback(
    (indices: number[]) => {
      if (!uri || !canRender()) return;
      const want: number[] = [];
      for (const i of indices) {
        const hit = cache.get(keyOf(i));
        if (hit) publish(keyOf(i), hit);
        else want.push(i);
      }
      // Newest requests first; keep only a short backlog of older ones.
      queue.current = [...want, ...queue.current.filter((i) => !want.includes(i))].slice(0, 8);
      pump();
    },
    [uri, keyOf, publish, pump]
  );

  return { image: (i: number) => rendered[keyOf(i)], request };
}
