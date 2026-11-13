import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { callUntypedRpc } from "@/lib/supabaseRpc";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

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

interface AllotmentUsage {
  id: string;
  booking_id: string;
  booking_reference: string | null;
  quantity_used: number;
  usage_date: string;
  released_at: string | null;
}

type AllotmentAction =
  | { action: "reserve"; bookingReference: string; quantity: number }
  | { action: "release_usage"; usageId: string }
  | { action: "release_allotment" };

export const useSupplierAllotments = (supplierId?: string, allotmentId?: string) => {
  const qc = useQueryClient();
  const orgId = useOrgId();

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
        .insert({ ...input, used_quantity: 0, organization_id: orgId! } as Database["public"]["Tables"]["supplier_allotments"]["Insert"])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم إضافة البلوك بنجاح");
      qc.invalidateQueries({ queryKey: ["supplier-allotments"] });
    },
    onError: (e: { message: string }) => toast.error("فشل: " + e.message),
  });

  const usageQuery = useQuery({
    queryKey: ["supplier-allotment-usage", orgId, allotmentId],
    enabled: !!orgId && !!allotmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allotment_usage")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("allotment_id", allotmentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AllotmentUsage[];
    },
  });

  const manageUsage = useMutation({
    mutationFn: async ({ id, ...input }: AllotmentAction & { id: string }) => {
      const { error } = await callUntypedRpc<string>("manage_supplier_allotment_usage", {
        _allotment_id: id,
        _action: input.action,
        _booking_reference: input.action === "reserve" ? input.bookingReference : null,
        _quantity: input.action === "reserve" ? input.quantity : null,
        _usage_id: input.action === "release_usage" ? input.usageId : null,
      });
      if (error) throw error;
    },
    onSuccess: async (_, { id, action }) => {
      const messages = {
        reserve: "تم تخصيص الكمية للحجز",
        release_usage: "تم إرجاع الكمية",
        release_allotment: "تم إغلاق الحصة أمام التخصيصات الجديدة",
      };
      toast.success(messages[action]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["supplier-allotments", orgId] }),
        qc.invalidateQueries({ queryKey: ["supplier-allotment-usage", orgId, id] }),
      ]);
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const getPerformance = async (supplierId: string) => {
    const { data, error } = await supabase.rpc("get_supplier_performance", {
      _org_id: orgId!,
      _supplier_id: supplierId,
    });
    if (error) throw error;
    return data;
  };

  return {
    allotments: allotmentsQuery.data || [],
    isLoading: allotmentsQuery.isLoading,
    createAllotment,
    isError: allotmentsQuery.isError,
    usage: usageQuery.data ?? [],
    usageLoading: usageQuery.isLoading,
    usageError: usageQuery.isError,
    manageUsage,
    getPerformance,
  };
};
