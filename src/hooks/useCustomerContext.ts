import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function isRecordId(value: string | null | undefined): value is string {
  return typeof value === 'string' && uuidPattern.test(value);
}

export async function readActiveCustomer(organizationId: string, customerId: string | null | undefined) {
  if (!isRecordId(customerId)) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('organization_id', organizationId)
    .eq('id', customerId)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type CustomerContext = NonNullable<Awaited<ReturnType<typeof readActiveCustomer>>>;

export function useCustomerContext(organizationId: string | null | undefined, customerId: string | null | undefined) {
  return useQuery({
    queryKey: ['active-customer-context', organizationId, customerId],
    enabled: Boolean(organizationId && isRecordId(customerId)),
    queryFn: () => readActiveCustomer(organizationId!, customerId),
  });
}

export function useActiveCustomerOptions(organizationId: string, initialCustomer?: CustomerContext | null) {
  const { data = [] } = useQuery({
    queryKey: ['active-customer-options', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('organization_id', organizationId)
        .is('archived_at', null)
        .order('name')
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
  return initialCustomer && !data.some(customer => customer.id === initialCustomer.id)
    ? [initialCustomer, ...data]
    : data;
}
