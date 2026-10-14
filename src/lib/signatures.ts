import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import type { PickedImage } from '@/lib/files';
import type { DrawnPath } from '@/lib/pdf/ops';

/**
 * Signatures kept on the device for reuse. Drawn ones are stored as their
 * vector path; picked images are copied into the app's own folder, since the
 * picker's cache copy can disappear.
 */
export type SavedSignature =
  | { id: string; kind: 'drawn'; path: DrawnPath; color: string }
  | { id: string; kind: 'image'; file: string; imageKind: 'png' | 'jpg'; width: number; height: number };

export const MAX_SIGNATURES = 6;

const DIR = new Directory(Paths.document, 'signatures');
const INDEX = new File(Paths.document, 'signatures.json');

function load(): SavedSignature[] {
  try {
    if (INDEX.exists) return JSON.parse(INDEX.textSync());
  } catch {
    // Unreadable index: start empty rather than crash the signing tool.
  }
  return [];
}

let saved = load();
const listeners = new Set<() => void>();

function commit(next: SavedSignature[]) {
  saved = next;
  if (!INDEX.exists) INDEX.create();
  INDEX.write(JSON.stringify(saved));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Saved signatures, newest first; re-renders the caller when they change. */
export function useSignatures(): SavedSignature[] {
  return useSyncExternalStore(subscribe, () => saved);
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Saves a signature, dropping the oldest beyond MAX_SIGNATURES. Returns its id. */
export function saveDrawn(path: DrawnPath, color: string): string {
  const id = newId();
  keep([{ id, kind: 'drawn', path, color }, ...saved]);
  return id;
}

export function saveImage(image: PickedImage): string {
  const id = newId();
  if (!DIR.exists) DIR.create({ intermediates: true });
  const file = `${id}.${image.kind}`;
  const dest = new File(DIR, file);
  dest.create();
  dest.write(image.bytes);
  keep([{ id, kind: 'image', file, imageKind: image.kind, width: image.width, height: image.height }, ...saved]);
  return id;
}

function keep(list: SavedSignature[]) {
  list.slice(MAX_SIGNATURES).forEach(deleteImageFile);
  commit(list.slice(0, MAX_SIGNATURES));
}

export function removeSignature(id: string) {
  const sig = saved.find((s) => s.id === id);
  if (sig) deleteImageFile(sig);
  commit(saved.filter((s) => s.id !== id));
}

function deleteImageFile(sig: SavedSignature) {
  if (sig.kind !== 'image') return;
  const f = new File(DIR, sig.file);
  if (f.exists) f.delete();
}

export function imageUri(sig: Extract<SavedSignature, { kind: 'image' }>) {
  return new File(DIR, sig.file).uri;
}

/** Loads a saved image signature back into the shape the stamp tools take. */
export async function loadImage(sig: Extract<SavedSignature, { kind: 'image' }>): Promise<PickedImage> {
  const f = new File(DIR, sig.file);
  return { uri: f.uri, name: sig.file, bytes: await f.bytes(), kind: sig.imageKind, width: sig.width, height: sig.height };
}
