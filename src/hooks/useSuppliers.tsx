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
  payment_type: 'prepaid' | 'deferred';
  payment_method_options: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  currencies?: Array<{
    id: string;
    currency: string;
    is_primary: boolean;
    exchange_rate?: number;
  }>;
}

export const useSuppliers = (supplierType?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all suppliers with their currencies
  const suppliersQuery = useQuery({
    queryKey: ['suppliers', supplierType],
    queryFn: async (): Promise<Supplier[]> => {
      let query = supabase
        .from('suppliers')
        .select(`
          *,
          supplier_currencies(
            id,
            currency,
            is_primary,
            exchange_rate
          )
        `)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (supplierType) {
        query = query.ilike('type', `%${supplierType}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Map the database response to our Supplier interface
      return (data || []).map((item: any): Supplier => ({
        id: item.id,
        name: item.name,
        contact_person: item.contact_person,
        email: item.email,
        phone: item.phone,
        address: item.address,
        supplier_type: item.type || 'general',
        payment_terms: item.payment_terms,
        payment_type: item.payment_type || 'deferred',
        payment_method_options: item.payment_method_options || ['bank_transfer'],
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        currencies: item.supplier_currencies || []
      }));
    }
  });

  // Add new supplier with enhanced error handling
  const addSupplierMutation = useMutation({
    mutationFn: async (newSupplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'currencies'>) => {
      const supplierData = {
        name: newSupplier.name,
        contact_person: newSupplier.contact_person,
        email: newSupplier.email,
        phone: newSupplier.phone,
        address: newSupplier.address,
        type: newSupplier.supplier_type,
        payment_terms: newSupplier.payment_terms,
        payment_type: newSupplier.payment_type,
        payment_method_options: JSON.stringify(newSupplier.payment_method_options),
        is_active: newSupplier.is_active
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting supplier:', error);
        
        // Enhanced error handling for different types of errors
        if (error.message.includes('row-level security policy')) {
          throw new Error('ليس لديك صلاحية لإضافة موردين. يرجى التواصل مع المدير للحصول على الصلاحيات المناسبة.');
        } else if (error.message.includes('duplicate key')) {
          throw new Error('يوجد مورد بنفس البيانات. يرجى التحقق من البيانات المدخلة.');
        } else if (error.message.includes('violates check constraint')) {
          throw new Error('البيانات المدخلة غير صحيحة. يرجى مراجعة جميع الحقول.');
        }
        
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: "تم إضافة المورد بنجاح",
        description: "تم حفظ بيانات المورد الجديد وإضافته إلى النظام",
      });
    },
    onError: (error: any) => {
      console.error('Error adding supplier:', error);
      
      const errorMessage = error.message || "حدث خطأ أثناء إضافة المورد";
      
      toast({
        title: "خطأ في إضافة المورد",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  return {
    suppliers: suppliersQuery.data || [],
    suppliersLoading: suppliersQuery.isLoading,
    addSupplier: addSupplierMutation.mutate,
    isAddingSupplier: addSupplierMutation.isPending
  };
};
