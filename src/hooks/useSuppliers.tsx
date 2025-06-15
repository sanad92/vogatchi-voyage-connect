
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  supplier_type: string;
  payment_terms?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSuppliers = (supplierType?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all suppliers with optional filtering by type
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers', supplierType],
    queryFn: async () => {
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (supplierType) {
        query = query.eq('supplier_type', supplierType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Supplier[];
    }
  });

  // Add new supplier
  const addSupplierMutation = useMutation({
    mutationFn: async (newSupplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([newSupplier])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: "تم إضافة المورد بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إضافة المورد",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    suppliers,
    suppliersLoading,
    addSupplier: addSupplierMutation.mutate,
    isAddingSupplier: addSupplierMutation.isPending
  };
};
