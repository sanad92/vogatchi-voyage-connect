
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Supplier } from "@/types/supplier"; // توحيد الاستيراد

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
      
      // Map the database response to the unified Supplier interface
      return (data || []).map((item: any): Supplier => ({
        id: item.id,
        name: item.name,
        contact_person: item.contact_person ?? null,
        email: item.email ?? null,
        phone: item.phone ?? null,
        address: item.address ?? null,
        bank_name: item.bank_name ?? null,
        bank_account: item.bank_account ?? null,
        tax_number: item.tax_number ?? null,
        rating: item.rating ?? null,
        supplier_type: item.type ?? "hotel", // المصدر دائماً حقل type في قاعدة البيانات
        payment_type: item.payment_type ?? "deferred",
        payment_method_options: Array.isArray(item.payment_method_options)
          ? item.payment_method_options
          : (
              typeof item.payment_method_options === 'string'
                ? (() => {
                    try {
                      const arr = JSON.parse(item.payment_method_options);
                      return Array.isArray(arr) ? arr : [item.payment_method_options];
                    } catch {
                      return [item.payment_method_options];
                    }
                  })()
                : []
            ),
        payment_terms: item.payment_terms ?? null,
        is_active: typeof item.is_active === "boolean" ? item.is_active : true,
        notes: item.notes ?? null,
        credit_limit: typeof item.credit_limit === 'number'
          ? item.credit_limit
          : (item.credit_limit ? Number(item.credit_limit) : null),
        created_at: item.created_at ?? undefined,
        updated_at: item.updated_at ?? undefined,
      }));
    }
  });

  // Add new supplier
  const addSupplierMutation = useMutation({
    mutationFn: async (newSupplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating'>) => {
      const supplierData = {
        name: newSupplier.name,
        contact_person: newSupplier.contact_person,
        email: newSupplier.email,
        phone: newSupplier.phone,
        address: newSupplier.address,
        bank_name: newSupplier.bank_name,
        bank_account: newSupplier.bank_account,
        tax_number: newSupplier.tax_number,
        type: newSupplier.supplier_type, // تخزين النوع في type مع التوحيد
        payment_terms: newSupplier.payment_terms,
        payment_type: newSupplier.payment_type,
        payment_method_options: JSON.stringify(newSupplier.payment_method_options),
        is_active: newSupplier.is_active,
        notes: newSupplier.notes,
        credit_limit: newSupplier.credit_limit
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting supplier:', error);

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

  // UPDATE supplier
  const updateSupplierMutation = useMutation({
    mutationFn: async ({
      id,
      ...updatedSupplier
    }: Partial<Supplier> & { id: string }) => {
      const updateData: any = { ...updatedSupplier };
      if (updateData.payment_method_options)
        updateData.payment_method_options = JSON.stringify(updateData.payment_method_options);
      if (updateData.supplier_type) {
        updateData.type = updateData.supplier_type;
        delete updateData.supplier_type;
      }

      const { data, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(
          error.message.includes('row-level security policy')
            ? 'ليس لديك صلاحية لتعديل بيانات الموردين.'
            : error.message
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'تم تعديل بيانات المورد بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'تعذر تعديل بيانات المورد',
        description: error.message ?? '',
        variant: 'destructive',
      });
    },
  });

  // DELETE supplier
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) {
        throw new Error(
          error.message.includes('row-level security policy')
            ? 'ليس لديك صلاحية لحذف الموردين.'
            : error.message
        );
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'تم حذف المورد بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'تعذر حذف المورد',
        description: error.message ?? '',
        variant: 'destructive',
      });
    },
  });

  return {
    suppliers: suppliersQuery.data || [],
    suppliersLoading: suppliersQuery.isLoading,
    addSupplier: addSupplierMutation.mutate,
    isAddingSupplier: addSupplierMutation.isPending,
    updateSupplier: updateSupplierMutation.mutate,
    isUpdatingSupplier: updateSupplierMutation.isPending,
    deleteSupplier: deleteSupplierMutation.mutate,
    isDeletingSupplier: deleteSupplierMutation.isPending,
  };
};

// نهاية الملف
