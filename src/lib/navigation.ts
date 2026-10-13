import { router } from 'expo-router';

import type { PickedFile } from '@/lib/files';
import type { ToolId } from '@/lib/tools';

type FileRef = Pick<PickedFile, 'uri' | 'name' | 'size'>;

/** Opens a PDF in the viewer. */
export function openViewer(file: FileRef) {
  router.push({ pathname: '/viewer', params: { file: JSON.stringify(file) } });
}

/** Opens a tool, optionally with files already loaded. */
export function openTool(id: ToolId, files?: FileRef[]) {
  router.push({ pathname: '/tool/[id]', params: files ? { id, files: JSON.stringify(files) } : { id } });
}
