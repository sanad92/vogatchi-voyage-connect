
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExchangeRate, SupportedCurrency, PRIMARY_CURRENCY } from "@/types/currency";
import { useToast } from "@/hooks/use-toast";

export const useExchangeRates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all exchange rates
  const { data: exchangeRates = [], isLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('is_active', true)
        .order('effective_date', { ascending: false });
      
      if (error) throw error;
      return data as ExchangeRate[];
    }
  });

  // Get current exchange rate
  const getCurrentRate = async (fromCurrency: string, toCurrency: string): Promise<number> => {
    if (fromCurrency === toCurrency) return 1.0;
    
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .eq('is_active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      console.warn(`No exchange rate found for ${fromCurrency} to ${toCurrency}, using 1.0`);
      return 1.0;
    }
    
    return data.rate;
  };

  // Convert amount between currencies
  const convertCurrency = async (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> => {
    if (fromCurrency === toCurrency) return amount;
    
    const rate = await getCurrentRate(fromCurrency, toCurrency);
    return amount * rate;
  };

  // Convert amount to primary currency (EGP)
  const convertToPrimaryCurrency = async (
    amount: number,
    fromCurrency: string
  ): Promise<number> => {
    return convertCurrency(amount, fromCurrency, PRIMARY_CURRENCY);
  };

  // Convert amount from primary currency (EGP)
  const convertFromPrimaryCurrency = async (
    amount: number,
    toCurrency: string
  ): Promise<number> => {
    return convertCurrency(amount, PRIMARY_CURRENCY, toCurrency);
  };

  // Add new exchange rate
  const addExchangeRateMutation = useMutation({
    mutationFn: async (newRate: Omit<ExchangeRate, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .insert([newRate])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast({
        title: "تم إضافة سعر الصرف بنجاح",
        description: "تم تحديث أسعار الصرف",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إضافة سعر الصرف",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update exchange rate
  const updateExchangeRateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExchangeRate> & { id: string }) => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast({
        title: "تم تحديث سعر الصرف بنجاح",
      });
    }
  });

  return {
    exchangeRates,
    isLoading,
    getCurrentRate,
    convertCurrency,
    convertToPrimaryCurrency,
    convertFromPrimaryCurrency,
    addExchangeRate: addExchangeRateMutation.mutate,
    updateExchangeRate: updateExchangeRateMutation.mutate,
    isAddingRate: addExchangeRateMutation.isPending,
    isUpdatingRate: updateExchangeRateMutation.isPending
  };
};
