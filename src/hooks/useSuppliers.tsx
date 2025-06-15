
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSuppliers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_suppliers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Add new supplier
  const addSupplierMutation = useMutation({
    mutationFn: async (newSupplier: any) => {
      const { data, error } = await supabase
        .from('hotel_suppliers')
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
