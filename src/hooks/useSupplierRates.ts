import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface SupplierRate {
  id: string;
  organization_id: string;
  supplier_id: string;
  contract_id: string | null;
  service_type: "hotel" | "flight" | "transport" | "car_rental" | "tour" | "other";
  service_reference: string | null;
  season_name: string | null;
  start_date: string;
  end_date: string;
  cost_price: number;
  selling_price: number;
  markup_percentage: number;
  currency: string;
  min_nights: number | null;
  max_nights: number | null;
  is_refundable: boolean;
  cancellation_policy: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSupplierRates = (supplierId?: string) => {
  const { currentOrganization } = useOrganization();
  const qc = useQueryClient();
  const orgId = currentOrganization?.id;

  const ratesQuery = useQuery({
    queryKey: ["supplier-rates", orgId, supplierId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("supplier_rates")
        .select("*")
        .eq("organization_id", orgId!)
        .order("start_date", { ascending: false });
      if (supplierId) q = q.eq("supplier_id", supplierId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SupplierRate[];
    },
  });

  const createRate = useMutation({
    mutationFn: async (input: Partial<SupplierRate>) => {
      const { data, error } = await supabase
        .from("supplier_rates")
        .insert({ ...input, organization_id: orgId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم إضافة السعر بنجاح");
      qc.invalidateQueries({ queryKey: ["supplier-rates"] });
    },
    onError: (e: any) => toast.error("فشل: " + e.message),
  });

  const updateRate = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SupplierRate> & { id: string }) => {
      const { error } = await supabase.from("supplier_rates").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث السعر");
      qc.invalidateQueries({ queryKey: ["supplier-rates"] });
    },
    onError: (e: any) => toast.error("فشل: " + e.message),
  });

  const deleteRate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف السعر");
      qc.invalidateQueries({ queryKey: ["supplier-rates"] });
    },
    onError: (e: any) => toast.error("فشل: " + e.message),
  });

  const findRate = async (params: {
    supplierId: string;
    serviceType: string;
    serviceDate: string;
    serviceReference?: string;
  }) => {
    const { data, error } = await supabase.rpc("find_supplier_rate", {
      _org_id: orgId!,
      _supplier_id: params.supplierId,
      _service_type: params.serviceType,
      _service_date: params.serviceDate,
      _service_reference: params.serviceReference || null,
    });
    if (error) throw error;
    return data?.[0] || null;
  };

  return {
    rates: ratesQuery.data || [],
    isLoading: ratesQuery.isLoading,
    createRate,
    updateRate,
    deleteRate,
    findRate,
  };
};
