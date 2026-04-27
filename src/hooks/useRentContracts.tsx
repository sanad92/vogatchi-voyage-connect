
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrgId } from './useOrgId';

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
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export const useRentContracts = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: rentContracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['rent-contracts', orgId],
    queryFn: async () => {
      let query: any = supabase
        .from('rent_contracts' as any)
        .select('*')
        .eq('is_active', true)
        .order('contract_number');

      if (orgId) query = query.eq('organization_id', orgId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as RentContract[];
    },
    enabled: !!orgId,
  });

  const addRentContractMutation = useMutation({
    mutationFn: async (contract: Omit<RentContract, 'id' | 'created_at' | 'updated_at'>) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const payload: any = { ...contract, organization_id: orgId, created_by: userId };

      const { data, error } = await (supabase
        .from('rent_contracts' as any)
        .insert(payload)
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-contracts'] });
      toast.success('تم إضافة عقد الإيجار بنجاح');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ أثناء إضافة عقد الإيجار: ' + (error?.message || ''));
      console.error('Error adding rent contract:', error);
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
