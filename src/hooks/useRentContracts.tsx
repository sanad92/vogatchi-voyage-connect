
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { RentContract } from '@/types/expenses';

export const useRentContracts = () => {
  const queryClient = useQueryClient();

  // جلب عقود الإيجار
  const { data: rentContracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['rent-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_contracts')
        .select('*')
        .eq('is_active', true)
        .order('contract_number');

      if (error) throw error;
      return data as RentContract[];
    },
  });

  // إضافة عقد إيجار
  const addRentContractMutation = useMutation({
    mutationFn: async (contract: Omit<RentContract, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rent_contracts')
        .insert(contract)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-contracts'] });
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم إضافة عقد الإيجار بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الإضافة",
        description: "حدث خطأ أثناء إضافة عقد الإيجار",
        variant: "destructive",
      });
    },
  });

  const addRentContract = (contract: Omit<RentContract, 'id' | 'created_at' | 'updated_at'>) => {
    addRentContractMutation.mutate(contract);
  };

  return {
    rentContracts,
    contractsLoading,
    addRentContract,
    isAddingContract: addRentContractMutation.isPending,
  };
};
