import { memo, useState } from 'react';
import { Platform, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  MARKER_OPACITY,
  TEXT_ASCENT,
  TEXT_LINE_HEIGHT,
  smoothPath,
  type Annotation,
  type InkAnnotation,
  type Point,
} from '@/lib/pdf/ops';

export type AnnotTool = 'pan' | 'pen' | 'marker' | 'text' | 'eraser';
export type AnnotItem = Annotation & { id: number };

/** Close to the PDF's Helvetica, so the preview matches the saved file. */
const TEXT_FONT = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });

/**
 * Annotation overlay for one page. Coordinates are fractions of the page,
 * matching `annotate()` in the PDF engine; `smoothPath` is shared with it so
 * the preview and the saved file draw the same curves.
 */
export const AnnotationLayer = memo(function AnnotationLayer({
  page,
  width,
  height,
  items,
  tool,
  color,
  weight,
  onAdd,
  onErase,
  onText,
}: {
  page: number;
  width: number;
  height: number;
  items: AnnotItem[];
  tool: AnnotTool;
  color: string;
  /** Stroke width or font size as a fraction of the page width. */
  weight: number;
  onAdd: (a: Annotation) => void;
  onErase: (id: number) => void;
  onText: (page: number, x: number, y: number) => void;
}) {
  const [live, setLive] = useState<Point[] | null>(null);
  const at = (e: GestureResponderEvent): Point => ({
    x: Math.min(1, Math.max(0, e.nativeEvent.locationX / width)),
    y: Math.min(1, Math.max(0, e.nativeEvent.locationY / height)),
  });
  const drawing = tool === 'pen' || tool === 'marker';

  function erase(p: Point) {
    // Topmost first; a forgiving radius so thin strokes are easy to hit.
    for (let i = items.length - 1; i >= 0; i--) {
      if (hits(items[i], p, width, height)) {
        onErase(items[i].id);
        return;
      }
    }
  }

  const handlers =
    tool === 'pan'
      ? {}
      : {
          onStartShouldSetResponder: () => true,
          onMoveShouldSetResponder: () => drawing,
          onResponderTerminationRequest: () => false,
          onResponderGrant: (e: GestureResponderEvent) => {
            if (drawing) setLive([at(e)]);
          },
          onResponderMove: (e: GestureResponderEvent) => {
            if (!drawing) return;
            const p = at(e);
            setLive((pts) => {
              if (!pts) return [p];
              const prev = pts[pts.length - 1];
              // Skip sub-pixel jitter to keep paths compact.
              if (Math.abs(prev.x - p.x) * width + Math.abs(prev.y - p.y) * height < 1.5) return pts;
              return [...pts, p];
            });
          },
          onResponderRelease: (e: GestureResponderEvent) => {
            const p = at(e);
            if (drawing && live) {
              onAdd({ kind: 'ink', page, points: [...live, p], color, width: weight, marker: tool === 'marker' });
              setLive(null);
            } else if (tool === 'text') {
              onText(page, p.x, p.y);
            } else if (tool === 'eraser') {
              erase(p);
            }
          },
        };

  const scale = (pts: Point[]) => pts.map((q) => ({ x: q.x * width, y: q.y * height }));
  const liveInk: InkAnnotation | null = live
    ? { kind: 'ink', page, points: live, color, width: weight, marker: tool === 'marker' }
    : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={tool === 'pan' ? 'none' : 'auto'} {...handlers}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {[...items, ...(liveInk ? [{ ...liveInk, id: -1 }] : [])].map((a) =>
          a.kind === 'ink' ? (
            <Path
              key={a.id}
              d={smoothPath([scale(a.points)])}
              stroke={a.color}
              strokeOpacity={a.marker ? MARKER_OPACITY : 1}
              strokeWidth={a.width * width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null
        )}
      </Svg>
      {items.map((a) =>
        a.kind === 'text' ? (
          <Text
            key={a.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: a.x * width,
              // Shift so the first baseline sits where the PDF puts it.
              top: a.y * height - a.size * width * (TEXT_LINE_HEIGHT - 1) * 0.5 - a.size * width * (0.93 - TEXT_ASCENT),
              fontFamily: TEXT_FONT,
              fontSize: a.size * width,
              lineHeight: a.size * width * TEXT_LINE_HEIGHT,
              color: a.color,
            }}>
            {a.text}
          </Text>
        ) : null
      )}
    </View>
  );
});

/** Whether a tap at `p` (page fractions) lands on an annotation. */
function hits(a: AnnotItem, p: Point, width: number, height: number): boolean {
  const px = p.x * width;
  const py = p.y * height;
  if (a.kind === 'text') {
    const size = a.size * width;
    const lines = a.text.split('\n');
    const w = Math.max(...lines.map((l) => l.length)) * size * 0.55;
    const h = lines.length * size * TEXT_LINE_HEIGHT;
    const x = a.x * width;
    const y = a.y * height;
    return px >= x - 12 && px <= x + w + 12 && py >= y - 12 && py <= y + h + 12;
  }
  // Fingers are imprecise: allow ~22pt beyond the stroke edge.
  const reach = (a.width * width) / 2 + 22;
  for (let i = 0; i < a.points.length; i++) {
    const q = a.points[i];
    const r = a.points[Math.min(i + 1, a.points.length - 1)];
    if (distToSegment(px, py, q.x * width, q.y * height, r.x * width, r.y * height) <= reach) return true;
  }
  return false;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
