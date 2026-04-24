import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface SupplierAllotment {
  id: string;
  organization_id: string;
  supplier_id: string;
  contract_id: string | null;
  service_type: "hotel" | "flight" | "transport" | "car_rental" | "tour" | "other";
  service_reference: string | null;
  allotment_name: string;
  start_date: string;
  end_date: string;
  total_quantity: number;
  used_quantity: number;
  release_days: number | null;
  cost_per_unit: number | null;
  currency: string;
  status: "active" | "expired" | "released" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useSupplierAllotments = (supplierId?: string) => {
  const { currentOrganization } = useOrganization();
  const qc = useQueryClient();
  const orgId = currentOrganization?.id;

  const allotmentsQuery = useQuery({
    queryKey: ["supplier-allotments", orgId, supplierId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("supplier_allotments")
        .select("*")
        .eq("organization_id", orgId!)
        .order("start_date", { ascending: false });
      if (supplierId) q = q.eq("supplier_id", supplierId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SupplierAllotment[];
    },
  });

  const createAllotment = useMutation({
    mutationFn: async (input: Partial<SupplierAllotment>) => {
      const { data, error } = await supabase
        .from("supplier_allotments")
        .insert({ ...input, organization_id: orgId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم إضافة البلوك بنجاح");
      qc.invalidateQueries({ queryKey: ["supplier-allotments"] });
    },
    onError: (e: any) => toast.error("فشل: " + e.message),
  });

  const updateAllotment = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SupplierAllotment> & { id: string }) => {
      const { error } = await supabase.from("supplier_allotments").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث البلوك");
      qc.invalidateQueries({ queryKey: ["supplier-allotments"] });
    },
    onError: (e: any) => toast.error("فشل: " + e.message),
  });

  const deleteAllotment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_allotments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف البلوك");
      qc.invalidateQueries({ queryKey: ["supplier-allotments"] });
    },
    onError: (e: any) => toast.error("فشل: " + e.message),
  });

  const getPerformance = async (supplierId: string) => {
    const { data, error } = await supabase.rpc("get_supplier_performance", {
      _org_id: orgId!,
      _supplier_id: supplierId,
    });
    if (error) throw error;
    return data as any;
  };

  return {
    allotments: allotmentsQuery.data || [],
    isLoading: allotmentsQuery.isLoading,
    createAllotment,
    updateAllotment,
    deleteAllotment,
    getPerformance,
  };
};
