import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useOrgId } from '@/hooks/useOrgId';

export interface Hotel {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  destination_id?: string;
  location: string;
  location_ar: string;
  image_url?: string;
  rating: number;
  star_rating: number;
  features: string[];
  features_ar: string[];
  price_range?: string;
  currency: string;
  is_featured: boolean;
  is_active: boolean;
  contact_info?: any;
  meta_title?: string;
  meta_description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}


export function normalizeHotel(row: Tables<'hotels'>): Hotel {
  return {
    ...row,
    name_ar: row.name_ar ?? row.name,
    location: row.location ?? row.address ?? row.city ?? '',
    location_ar: row.location_ar ?? row.location ?? row.address ?? row.city ?? '',
    features: Array.isArray(row.features ?? row.amenities) ? ((row.features ?? row.amenities) as unknown[]).filter((v): v is string => typeof v === 'string') : [],
    features_ar: Array.isArray(row.features_ar) ? row.features_ar.filter((v): v is string => typeof v === 'string') : [],
    contact_info: row.contact_info ?? { phone: row.phone, email: row.email },
  };
}

export const useHotels = (destinationId?: string) => {
  const orgId = useOrgId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['hotels', orgId, destinationId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      if (!orgId) return [];
      let request = supabase.from('hotels').select('*')
        .eq('organization_id', orgId).eq('is_active', true).order('sort_order', { ascending: true });
      if (destinationId) request = request.eq('destination_id', destinationId);
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []).map(normalizeHotel);
    },
  });
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['hotels', orgId] });
    toast({ title: 'تم حفظ الفندق بنجاح' });
  };
  const onError = () => toast({ title: 'تعذر حفظ الفندق', description: 'تحقق من الاتصال والصلاحيات ثم أعد المحاولة.', variant: 'destructive' });
  const add = useMutation({
    mutationFn: async (input: Omit<Hotel, 'id' | 'created_at' | 'updated_at'>) => {
      if (!orgId) throw new Error('لا توجد مؤسسة نشطة');
      const { data, error } = await supabase.from('hotels')
        .insert({ ...input, organization_id: orgId }).select().single();
      if (error) throw error;
      if (!data) throw new Error('لم يتم تأكيد الحفظ');
      return data;
    }, onSuccess, onError,
  });
  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Hotel> }) => {
      if (!orgId) throw new Error('لا توجد مؤسسة نشطة');
      const { id: _id, created_at: _created, updated_at: _updated, ...fields } = updates;
      const { data, error } = await supabase.from('hotels')
        .update({ ...fields, organization_id: orgId }).eq('id', id).eq('organization_id', orgId).select().single();
      if (error) throw error;
      if (!data) throw new Error('لم يتم تأكيد الحفظ');
      return data;
    }, onSuccess, onError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('لا توجد مؤسسة نشطة');
      const { data, error } = await supabase.from('hotels')
        .update({ is_active: false }).eq('id', id).eq('organization_id', orgId).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('لم يتم تأكيد الحذف');
    }, onSuccess, onError,
  });
  return {
    hotels: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addHotel: add.mutateAsync,
    updateHotel: (id: string, updates: Partial<Hotel>) => update.mutateAsync({ id, updates }),
    deleteHotel: remove.mutateAsync,
    refreshHotels: query.refetch,
  };
};
