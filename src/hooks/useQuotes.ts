import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';
import { useRef } from 'react';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  item_type: string;
  description: string;
  supplier_id?: string | null;
  cost_price: number;
  selling_price: number;
  quantity: number;
  total_cost: number;
  total_selling: number;
  details?: Record<string, unknown>;
  sort_order?: number;
}

export interface Quote {
  id: string;
  organization_id: string;
  quote_number: string;
  customer_id: string | null;
  customer_name: string | null;
  status: string;
  travel_date: string | null;
  return_date: string | null;
  destination: string | null;
  number_of_travelers: number;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  total_cost: number;
  total_profit: number;
  currency?: string | null;
  valid_until: string | null;
  assigned_employee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customers?: { name: string; phone: string | null; email: string | null } | null;
  employees?: { full_name: string } | null;
}

export interface QuoteFormData {
  customer_id: string | null;
  customer_name: string;
  travel_date: string | null;
  return_date: string | null;
  destination: string;
  number_of_travelers: number;
  notes: string;
  discount_amount: number;
  vat_rate: number;
  valid_until: string | null;
  assigned_employee_id: string | null;
  status: string;
  items: QuoteItem[];
}

export const useQuotes = (filters?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const creationRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;

  const quotesQuery = useQuery({
    queryKey: ['quotes', orgId, filters?.status, filters?.search, page],
    queryFn: async () => {
      let query = supabase
        .from('quotes')
        .select('*, customers(name, phone, email), employees(full_name)', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`quote_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Quote[], count: count ?? 0 };
    },
    enabled: !!orgId,
  });

  const useQuoteDetails = (quoteId: string) => useQuery({
    queryKey: ['quote', quoteId, orgId],
    queryFn: async () => {
      const [quoteRes, itemsRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, customers(name, phone, email), employees(full_name)')
          .eq('id', quoteId)
          .single(),
        supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', quoteId)
          .order('sort_order'),
      ]);
      if (quoteRes.error) throw quoteRes.error;
      if (itemsRes.error) throw itemsRes.error;
      return { quote: quoteRes.data as Quote, items: itemsRes.data as QuoteItem[] };
    },
    enabled: !!quoteId && !!orgId,
  });

  const createQuote = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      if (!orgId || !user?.id) throw new Error('تعذر تحديد الشركة أو المستخدم');
      // Reuse the key after timeout/retry, even if the form returns a new object.
      const payload = JSON.parse(JSON.stringify(data));
      const fingerprint = JSON.stringify([orgId, user.id, payload]);
      if (creationRequest.current?.fingerprint !== fingerprint) {
        creationRequest.current = { fingerprint, id: crypto.randomUUID() };
      }
      const { data: quote, error } = await callUntypedRpc<Quote>('create_quote_atomic', {
        _org: orgId, _request_id: creationRequest.current.id, _payload: payload,
      });
      if (error) throw new Error(error.message);
      if (!quote?.id) throw new Error('لم يرجع الخادم تأكيد حفظ العرض؛ أعد المحاولة');
      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('تم إنشاء عرض السعر بنجاح');
    },
    onError: (err: Error) => toast.error('فشل في إنشاء عرض السعر: ' + err.message),
  });

  const updateQuoteStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote'] });
      toast.success('تم تحديث حالة العرض');
    },
    onError: (err: Error) => toast.error('فشل في تحديث الحالة: ' + err.message),
  });

  const deleteQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('تم حذف عرض السعر');
    },
    onError: (err: Error) => toast.error('فشل في الحذف: ' + err.message),
  });

  return {
    quotes: quotesQuery.data?.data ?? [],
    totalCount: quotesQuery.data?.count ?? 0,
    isLoading: quotesQuery.isLoading,
    createQuote,
    updateQuoteStatus,
    deleteQuote,
    useQuoteDetails,
  };
};
