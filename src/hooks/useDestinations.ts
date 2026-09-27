import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useOrgId } from '@/hooks/useOrgId';

export interface Destination {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  country: string;
  country_ar: string;
  image_url?: string;
  rating: number;
  attractions: string[];
  attractions_ar: string[];
  is_featured: boolean;
  is_active: boolean;
  meta_title?: string;
  meta_description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}


export function normalizeDestination(row: Tables<'destinations'>): Destination {
  return {
    ...row,
    name_ar: row.name_ar ?? row.name,
    country: row.country ?? '',
    country_ar: row.country_ar ?? row.country ?? '',
    attractions: Array.isArray(row.attractions) ? row.attractions.filter((v): v is string => typeof v === 'string') : [],
    attractions_ar: Array.isArray(row.attractions_ar) ? row.attractions_ar.filter((v): v is string => typeof v === 'string') : [],
  };
}

export const useDestinations = () => {
  const orgId = useOrgId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['destinations', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      if (!orgId) return [];
      let request = supabase.from('destinations').select('*')
        .eq('organization_id', orgId).eq('is_active', true).order('sort_order', { ascending: true });
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []).map(normalizeDestination);
    },
  });
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['destinations', orgId] });
    toast({ title: 'تم حفظ الوجهة بنجاح' });
  };
  const onError = () => toast({ title: 'تعذر حفظ الوجهة', description: 'تحقق من الاتصال والصلاحيات ثم أعد المحاولة.', variant: 'destructive' });
  const add = useMutation({
    mutationFn: async (input: Omit<Destination, 'id' | 'created_at' | 'updated_at'>) => {
      if (!orgId) throw new Error('لا توجد مؤسسة نشطة');
      const { data, error } = await supabase.from('destinations')
        .insert({ ...input, organization_id: orgId }).select().single();
      if (error) throw error;
      if (!data) throw new Error('لم يتم تأكيد الحفظ');
      return data;
    }, onSuccess, onError,
  });
  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Destination> }) => {
      if (!orgId) throw new Error('لا توجد مؤسسة نشطة');
      const { id: _id, created_at: _created, updated_at: _updated, ...fields } = updates;
      const { data, error } = await supabase.from('destinations')
        .update({ ...fields, organization_id: orgId }).eq('id', id).eq('organization_id', orgId).select().single();
      if (error) throw error;
      if (!data) throw new Error('لم يتم تأكيد الحفظ');
      return data;
    }, onSuccess, onError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('لا توجد مؤسسة نشطة');
      const { data, error } = await supabase.from('destinations')
        .update({ is_active: false }).eq('id', id).eq('organization_id', orgId).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('لم يتم تأكيد الحذف');
    }, onSuccess, onError,
  });
  return {
    destinations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addDestination: add.mutateAsync,
    updateDestination: (id: string, updates: Partial<Destination>) => update.mutateAsync({ id, updates }),
    deleteDestination: remove.mutateAsync,
    refreshDestinations: query.refetch,
  };
};
