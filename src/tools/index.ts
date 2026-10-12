import type { ComponentType } from 'react';

import type { ToolProps } from '@/hooks/use-tool';

import type { ToolId } from '@/lib/tools';
import { CompressTool, ImagesToPdfTool, PdfToImagesTool } from '@/tools/convert';
import { FlattenTool, MetadataTool, PageNumbersTool, SignTool, WatermarkTool } from '@/tools/edit';
import { MergeTool, NUpTool, OrganizeTool, RemovePagesTool, RotateTool, SplitTool } from '@/tools/organize';
import { ProtectTool, UnlockTool } from '@/tools/security';

export const TOOL_SCREENS: Record<ToolId, ComponentType<ToolProps>> = {
  merge: MergeTool,
  split: SplitTool,
  organize: OrganizeTool,
  rotate: RotateTool,
  'remove-pages': RemovePagesTool,
  'n-up': NUpTool,
  'images-to-pdf': ImagesToPdfTool,
  'pdf-to-images': PdfToImagesTool,
  compress: CompressTool,
  watermark: WatermarkTool,
  'page-numbers': PageNumbersTool,
  sign: SignTool,
  metadata: MetadataTool,
  flatten: FlattenTool,
  protect: ProtectTool,
  unlock: UnlockTool,
};
