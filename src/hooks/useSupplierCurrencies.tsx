
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SupportedCurrency } from "@/types/currency";

export interface SupplierCurrency {
  id: string;
  supplier_id: string;
  currency: SupportedCurrency;
  is_primary: boolean;
  exchange_rate?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useSupplierCurrencies = (supplierId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get supplier currencies
  const { data: supplierCurrencies = [], isLoading } = useQuery({
    queryKey: ['supplier-currencies', supplierId],
    queryFn: async (): Promise<SupplierCurrency[]> => {
      let query = supabase
        .from('supplier_currencies')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('currency', { ascending: true });
      
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!supplierId
  });

  // Add currency to supplier
  const addCurrencyMutation = useMutation({
    mutationFn: async (newCurrency: Omit<SupplierCurrency, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('supplier_currencies')
        .insert(newCurrency)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-currencies'] });
      toast({
        title: "تم إضافة العملة بنجاح",
        description: "تم إضافة العملة للمورد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إضافة العملة",
        description: error.message || "حدث خطأ أثناء إضافة العملة",
        variant: "destructive",
      });
    }
  });

  // Update currency
  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SupplierCurrency> }) => {
      const { data, error } = await supabase
        .from('supplier_currencies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-currencies'] });
      toast({
        title: "تم تحديث العملة بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تحديث العملة",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Remove currency
  const removeCurrencyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('supplier_currencies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-currencies'] });
      toast({
        title: "تم حذف العملة بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في حذف العملة",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    supplierCurrencies,
    isLoading,
    addCurrency: addCurrencyMutation.mutate,
    updateCurrency: updateCurrencyMutation.mutate,
    removeCurrency: removeCurrencyMutation.mutate,
    isAddingCurrency: addCurrencyMutation.isPending,
    isUpdatingCurrency: updateCurrencyMutation.isPending,
    isRemovingCurrency: removeCurrencyMutation.isPending,
  };
};
