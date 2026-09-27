import type { Json, Tables } from '@/integrations/supabase/types';
import type { BlockData } from '@/types/blocks';

function objectContent(value: Json): Record<string, Json | undefined> {
  if (typeof value === 'string') {
    try { return objectContent(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function normalizePage(row: Tables<'pages'>) {
  return { ...row, name: row.title, is_active: row.is_published, seo_description: row.seo_description ?? row.description };
}

export function normalizePageBlock(row: Tables<'blocks'>): BlockData {
  return {
    ...row,
    type: row.type as BlockData['type'],
    title: row.title ?? '',
    content: objectContent(row.content),
    layout_settings: objectContent(row.layout_settings),
    style_settings: objectContent(row.style_settings),
    section: row.section ?? 'main',
  };
}
