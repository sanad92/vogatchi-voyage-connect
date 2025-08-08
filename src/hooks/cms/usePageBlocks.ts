
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BlockData } from "@/types/blocks";

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
  const query = useQuery({
    queryKey: ["page-blocks", slug],
    queryFn: async () => {
      console.log("[usePageBlocks] fetching page by slug:", slug);
      const { data: page, error: pageError } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle<PageRecord>();

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
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (blocksError) {
        console.error("[usePageBlocks] blocks error:", blocksError);
        throw blocksError;
      }

      console.log("[usePageBlocks] blocks loaded:", blocks?.length || 0);
      return {
        page,
        blocks: (blocks as unknown as BlockData[]) || [],
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

