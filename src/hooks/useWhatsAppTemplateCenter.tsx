import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import { throwEdgeError } from '@/lib/edgeError';
import { TRAVEL_TEMPLATE_LIBRARY, type LibraryTemplate } from '@/data/travelTemplateLibrary';
import type { TemplateCategoryKey } from '@/data/travelTemplateCategories';

export interface TemplateFilters {
  search?: string;
  category?: TemplateCategoryKey | 'all';
  status?: 'all' | 'approved' | 'pending' | 'rejected' | 'draft';
  locale?: 'all' | 'ar' | 'en';
}

export const useWhatsAppTemplateCenter = (filters: TemplateFilters = {}) => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['whatsapp-templates-center', orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('organization_id', orgId!)
        .order('updated_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      let list = data || [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(
          (t: any) =>
            (t.name || '').toLowerCase().includes(s) ||
            (t.body_text || '').toLowerCase().includes(s) ||
            (t.description || '').toLowerCase().includes(s),
        );
      }
      if (filters.category && filters.category !== 'all') {
        list = list.filter((t: any) => t.category_key === filters.category);
      }
      if (filters.status && filters.status !== 'all') {
        list = list.filter((t: any) => (t.status || '').toLowerCase() === filters.status);
      }
      if (filters.locale && filters.locale !== 'all') {
        list = list.filter((t: any) => (t.locale || 'ar') === filters.locale);
      }
      return list;
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['whatsapp-template-analytics', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from('whatsapp_template_analytics' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const importFromLibrary = useMutation({
    mutationFn: async (items: LibraryTemplate[]) => {
      if (!orgId) throw new Error('No organization');
      const rows = items.map((t) => ({
        organization_id: orgId,
        name: t.name,
        language: t.locale,
        locale: t.locale,
        category: t.category,
        category_key: t.category,
        description: t.description,
        header_text: t.header || null,
        body_text: t.body,
        footer_text: t.footer || null,
        variables: t.variables as any,
        tags: t.tags as any,
        preview_variables: (t.previewVariables || {}) as any,
        status: 'draft',
        is_library_seed: true,
        library_source_key: t.key,
      }));
      const { error } = await supabase
        .from('whatsapp_templates')
        .upsert(rows, { onConflict: 'organization_id,library_source_key' });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`تم استيراد ${n} قالب من المكتبة`);
      qc.invalidateQueries({ queryKey: ['whatsapp-templates-center'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الاستيراد'),
  });

  const saveTemplate = useMutation({
    mutationFn: async (payload: any) => {
      if (!orgId) throw new Error('No organization');
      const row = { ...payload, organization_id: orgId };
      if (payload.id) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update(row)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('whatsapp_templates').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('تم الحفظ');
      qc.invalidateQueries({ queryKey: ['whatsapp-templates-center'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الحفظ'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['whatsapp-templates-center'] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الحذف'),
  });

  const syncMeta = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-sync-templates', {
        body: { organizationId: orgId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`تمت المزامنة: ${d?.updated || 0} محدَّث، ${d?.created || 0} جديد`);
      qc.invalidateQueries({ queryKey: ['whatsapp-templates-center'] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشلت المزامنة'),
  });

  /** Sends drafts to Meta for approval (single, selection, or all pending drafts). */
  const submitToMeta = useMutation({
    mutationFn: async (input: { templateIds?: string[]; allDrafts?: boolean }) => {
      if (!orgId) throw new Error('No organization');
      const { data, error } = await supabase.functions.invoke('whatsapp-submit-template', {
        body: { organizationId: orgId, ...input },
      });
      if (error) await throwEdgeError(error, 'فشل إرسال القالب إلى Meta');
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { submitted: number; failed: number; results: any[] };
    },
    onSuccess: (d) => {
      const failedItems = (d?.results || []).filter((r: any) => !r.ok);
      if (d?.submitted) toast.success(`تم إرسال ${d.submitted} قالب إلى Meta للمراجعة`);
      if (failedItems.length) {
        toast.error(
          `فشل ${failedItems.length} قالب: ` +
            failedItems.slice(0, 3).map((r: any) => `${r.name}: ${r.error}`).join(' | '),
          { duration: 12000 },
        );
      }
      if (!d?.submitted && !failedItems.length) toast.info('لا توجد مسودات جاهزة للإرسال');
      qc.invalidateQueries({ queryKey: ['whatsapp-templates-center'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الإرسال إلى Meta'),
  });


  const generateWithAI = useMutation({
    mutationFn: async (payload: {
      brief: string;
      category: TemplateCategoryKey;
      tone: 'professional' | 'friendly' | 'urgent';
      locale: 'ar' | 'en';
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-generate-template', {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast.error(e?.message || 'فشل توليد القالب'),
  });

  const library = TRAVEL_TEMPLATE_LIBRARY;

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    analytics: analyticsQuery.data || [],
    library,
    importFromLibrary,
    saveTemplate,
    deleteTemplate,
    syncMeta,
    submitToMeta,
    generateWithAI,
  };
};

export const suggestTemplatesForContext = (
  templates: any[],
  context: { type: 'booking' | 'invoice' | 'crm'; status?: string | null; subtype?: string | null },
): any[] => {
  const st = (context.status || '').toLowerCase();
  const sub = (context.subtype || '').toLowerCase();

  // Prefer templates with matching category_key
  const categoryMap: Record<string, string[]> = {
    booking: ['booking_hotels', 'flights'],
    invoice: ['payments'],
    crm: ['crm_followups', 'marketing'],
  };
  const preferred = categoryMap[context.type] || [];

  const scored = templates
    .filter((t) => (t.status || '').toLowerCase() !== 'rejected')
    .map((t) => {
      let score = 0;
      if (preferred.includes(t.category_key)) score += 5;
      const hay = `${t.name} ${t.body_text} ${(t.tags || []).join(' ')}`.toLowerCase();
      if (st && hay.includes(st)) score += 3;
      if (sub && hay.includes(sub)) score += 2;
      if ((t.status || '').toLowerCase() === 'approved') score += 1;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.t);

  return scored;
};
