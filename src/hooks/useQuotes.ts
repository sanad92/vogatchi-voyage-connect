import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';
import { calculateFinancialBreakdown } from '@/utils/calculationHelpers';

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
  details?: Record<string, any>;
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

  const quoteDetailsQuery = (quoteId: string) => useQuery({
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
      // Generate quote number
      const { data: qNum, error: numErr } = await supabase.rpc('generate_quote_number');
      if (numErr) throw numErr;

      const subtotal = data.items.reduce((sum, i) => sum + i.total_selling, 0);
      const totalCost = data.items.reduce((sum, i) => sum + i.total_cost, 0);
      const financialBreakdown = calculateFinancialBreakdown({
        subtotal,
        discountAmount: data.discount_amount ?? 0,
        vatRate: data.vat_rate ?? 0,
        totalCost,
      });
      const totalAmount = financialBreakdown.totalAmount;
      const totalProfit = financialBreakdown.totalProfit;

      const { data: quote, error } = await supabase
        .from('quotes')
        .insert({
          organization_id: orgId!,
          quote_number: qNum,
          customer_id: data.customer_id || null,
          customer_name: data.customer_name,
          status: data.status || 'draft',
          travel_date: data.travel_date || null,
          return_date: data.return_date || null,
          destination: data.destination || null,
          number_of_travelers: data.number_of_travelers,
          notes: data.notes || null,
          subtotal: financialBreakdown.subtotal,
          discount_amount: financialBreakdown.discountAmount,
          vat_rate: financialBreakdown.vatRate,
          vat_amount: financialBreakdown.vatAmount,
          total_amount: financialBreakdown.totalAmount,
          total_cost: totalCost,
          total_profit: totalProfit,
          valid_until: data.valid_until || null,
          assigned_employee_id: data.assigned_employee_id || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert items
      if (data.items.length > 0) {
        const { error: itemsErr } = await supabase.from('quote_items').insert(
          data.items.map((item, idx) => ({
            quote_id: quote.id,
            organization_id: orgId!,
            item_type: item.item_type,
            description: item.description,
            supplier_id: item.supplier_id || null,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            quantity: item.quantity,
            total_cost: item.total_cost,
            total_selling: item.total_selling,
            details: item.details || {},
            sort_order: idx,
          }))
        );
        if (itemsErr) throw itemsErr;
      }

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
    useQuoteDetails: quoteDetailsQuery,
  };
};
