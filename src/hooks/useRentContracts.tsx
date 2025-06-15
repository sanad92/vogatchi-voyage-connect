
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RentContract {
  id: string;
  contract_number: string;
  landlord_name: string;
  property_address: string;
  property_type: string;
  monthly_rent: number;
  currency: string;
  start_date: string;
  end_date: string;
  contract_terms?: string;
  annual_increase_percentage?: number;
  security_deposit?: number;
  utilities_included: boolean;
  maintenance_responsibility: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
      return data;
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
