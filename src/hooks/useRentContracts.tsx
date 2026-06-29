
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrgId } from './useOrgId';
import { getFriendlyDatabaseError } from '@/utils/databaseErrors';

export interface RentContract {
  id: string;
  contract_number?: string;
  property_name?: string | null;
  landlord_name: string;
  landlord_phone?: string | null;
  property_address?: string | null;
  property_type?: string | null;
  monthly_rent: number;
  currency: string;
  start_date?: string | null;
  end_date?: string | null;
  contract_start_date: string;
  contract_end_date: string;
  contract_duration_months?: number | null;
  renewal_period_months?: number | null;
  contract_terms?: string;
  contract_notes?: string | null;
  annual_increase_percentage?: number;
  security_deposit?: number;
  payment_day_of_month?: number | null;
  payment_method?: string | null;
  utilities_included?: boolean;
  maintenance_responsibility?: string;
  is_active: boolean;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

const normalizeRentContractPayload = (contract: Partial<RentContract> & Record<string, any>, orgId: string, userId?: string) => {
  const contractStartDate = contract.contract_start_date || contract.start_date;
  const contractEndDate = contract.contract_end_date || contract.end_date;
  const monthlyRent = Number(contract.monthly_rent || 0);
  const propertyAddress = String(contract.property_address || '').trim();
  const landlordName = String(contract.landlord_name || '').trim();

  if (!contractStartDate) throw new Error('تاريخ بداية العقد مطلوب');
  if (!contractEndDate) throw new Error('تاريخ انتهاء العقد مطلوب');
  if (!landlordName) throw new Error('اسم المالك مطلوب');
  if (monthlyRent <= 0) throw new Error('الإيجار الشهري يجب أن يكون أكبر من صفر');

  const start = new Date(contractStartDate);
  const end = new Date(contractEndDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error('صيغة تاريخ العقد غير صحيحة');
  if (start >= end) throw new Error('تاريخ انتهاء العقد يجب أن يكون بعد تاريخ البداية');

  return {
    contract_number: contract.contract_number?.trim() || null,
    property_name: contract.property_name || propertyAddress || contract.contract_number || 'عقار بدون اسم',
    property_type: contract.property_type || 'office',
    property_address: propertyAddress || null,
    landlord_name: landlordName,
    landlord_phone: contract.landlord_phone || null,
    monthly_rent: monthlyRent,
    currency: contract.currency || 'EGP',
    contract_start_date: contractStartDate,
    contract_end_date: contractEndDate,
    start_date: contractStartDate,
    end_date: contractEndDate,
    contract_duration_months: contract.contract_duration_months || contract.renewal_period_months || 12,
    renewal_period_months: contract.renewal_period_months || contract.contract_duration_months || 12,
    annual_increase_percentage: Number(contract.annual_increase_percentage || 0),
    security_deposit: Number(contract.security_deposit || 0),
    payment_day_of_month: contract.payment_day_of_month || 1,
    payment_method: contract.payment_method || null,
    contract_terms: contract.contract_terms || contract.contract_notes || null,
    contract_notes: contract.contract_notes || contract.contract_terms || null,
    utilities_included: Boolean(contract.utilities_included),
    maintenance_responsibility: contract.maintenance_responsibility || 'landlord',
    is_active: contract.is_active ?? true,
    organization_id: orgId,
    created_by: userId || null,
  };
};

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
      if (!orgId) throw new Error('لم يتم تحديد المؤسسة الحالية');
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const payload = normalizeRentContractPayload(contract as any, orgId, userId);

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
      toast.error('حدث خطأ أثناء إضافة عقد الإيجار: ' + getFriendlyDatabaseError(error));
      console.error('Error adding rent contract:', error);
    },
  });

  const addRentContract = (contract: Omit<RentContract, 'id' | 'created_at' | 'updated_at'>) => {
    return addRentContractMutation.mutateAsync(contract);
  };

  return {
    rentContracts,
    contractsLoading,
    addRentContract,
    isAddingContract: addRentContractMutation.isPending,
  };
};
