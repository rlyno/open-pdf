import type { PickedFile } from '@/lib/files';

/**
 * Holds a document URI handed to the app via "Open with", exactly as the OS
 * gave it. It must not travel through a route param: the router decodes
 * params (e.g. %3A -> ':'), and Android only honours the read grant for the
 * byte-identical URI.
 */
let pending: string | null = null;

export function setPendingUri(uri: string) {
  pending = uri;
}

export function peekPendingUri() {
  return pending;
}

export function clearPendingUri() {
  pending = null;
}


/** Files already in app storage (e.g. picked via the File hub's + button). */
let pendingFiles: PickedFile[] = [];

export function setPendingFiles(files: PickedFile[]) {
  pendingFiles = files;
}

export function peekPendingFiles() {
  return pendingFiles;
}

export function clearPendingFiles() {
  pendingFiles = [];
}
