
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExchangeRate, SupportedCurrency, PRIMARY_CURRENCY } from "@/types/currency";
import { useToast } from "@/hooks/use-toast";
import { useOrgId } from './useOrgId';

export const useExchangeRates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: exchangeRates = [], isLoading } = useQuery({
    queryKey: ['exchange-rates', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('exchange_rates').select('*').eq('is_active', true).order('effective_date', { ascending: false });
      if (error) throw error;
      return data as ExchangeRate[];
    },
    enabled: !!orgId,
  });

  const getCurrentRate = async (fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency): Promise<number> => {
    if (fromCurrency === toCurrency) return 1.0;
    const { data, error } = await supabase.from('exchange_rates').select('rate').eq('from_currency', fromCurrency).eq('to_currency', toCurrency).eq('is_active', true).order('effective_date', { ascending: false }).limit(1).single();
    if (error || !data) return 1.0;
    return data.rate;
  };

  const convertCurrency = async (amount: number, fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency): Promise<number> => {
    if (fromCurrency === toCurrency) return amount;
    return amount * await getCurrentRate(fromCurrency, toCurrency);
  };

  /**
   * @deprecated Multi-currency policy: each amount must be displayed in its own currency.
   * Do NOT use this for new dashboards or reports. Use per-currency grouping instead.
   * Kept only for the explicit "Convert Invoice Currency" user-initiated flow.
   */
  const convertToPrimaryCurrency = async (amount: number, fromCurrency: SupportedCurrency): Promise<number> => convertCurrency(amount, fromCurrency, PRIMARY_CURRENCY);
  /** @deprecated See convertToPrimaryCurrency. */
  const convertFromPrimaryCurrency = async (amount: number, toCurrency: SupportedCurrency): Promise<number> => convertCurrency(amount, PRIMARY_CURRENCY, toCurrency);

  const addExchangeRateMutation = useMutation({
    mutationFn: async (newRate: Omit<ExchangeRate, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('exchange_rates').insert({ ...newRate, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exchange-rates'] }); toast({ title: "تم إضافة سعر الصرف بنجاح" }); },
    onError: (error) => { toast({ title: "خطأ في إضافة سعر الصرف", description: error.message, variant: "destructive" }); }
  });

  const updateExchangeRateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExchangeRate> & { id: string }) => {
      const { data, error } = await supabase.from('exchange_rates').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exchange-rates'] }); }
  });

  return {
    exchangeRates, isLoading, getCurrentRate, convertCurrency, convertToPrimaryCurrency, convertFromPrimaryCurrency,
    addExchangeRate: addExchangeRateMutation.mutate, updateExchangeRate: updateExchangeRateMutation.mutate,
    isAddingRate: addExchangeRateMutation.isPending, isUpdatingRate: updateExchangeRateMutation.isPending
  };
};
