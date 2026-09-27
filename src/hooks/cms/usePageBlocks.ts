
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BlockData } from "@/types/blocks";
import { useOrgId } from '@/hooks/useOrgId';
import { normalizePage, normalizePageBlock } from '@/lib/cmsRecords';

interface PageRecord {
  id: string;
  slug: string;
  name: string;
  description?: string;
  is_active: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  og_image_url?: string;
  created_at: string;
  updated_at: string;
}

export const usePageBlocks = (slug: string) => {
  const orgId = useOrgId();
  const query = useQuery<{ page: PageRecord | null; blocks: BlockData[] }>({
    queryKey: ["page-blocks", orgId, slug],
    enabled: Boolean(orgId),
    queryFn: async () => {
      if (!orgId) return { page: null, blocks: [] };
      console.log("[usePageBlocks] fetching page by slug:", slug);
      const { data: page, error: pageError } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (pageError) {
        console.error("[usePageBlocks] page error:", pageError);
        throw pageError;
      }

      if (!page) {
        console.warn("[usePageBlocks] no page found for slug:", slug);
        return { page: null as PageRecord | null, blocks: [] as BlockData[] };
      }

      const { data: blocks, error: blocksError } = await supabase
        .from("blocks")
        .select("*")
        .eq("page_id", page.id)
        .eq('organization_id', orgId)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (blocksError) {
        console.error("[usePageBlocks] blocks error:", blocksError);
        throw blocksError;
      }

      console.log("[usePageBlocks] blocks loaded:", blocks?.length || 0);
      return {
        page: normalizePage(page),
        blocks: (blocks ?? []).map(normalizePageBlock),
      };
    },
  });

  return {
    page: query.data?.page ?? null,
    blocks: query.data?.blocks ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};
