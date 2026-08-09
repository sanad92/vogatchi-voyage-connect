import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import type {
  GateResult,
  SopApprovalType,
  SopDepartment,
  SopHandoverType,
  SopLeadStage,
} from '@/lib/sop';
import { labelMissing, labelViolation } from '@/lib/sop';

const db = supabase as any;

export interface SopLead {
  id: string;
  organization_id: string;
  stage: SopLeadStage;
  owner_department: SopDepartment;
  current_owner_id: string | null;
  customer_id: string | null;
  conversation_id: string | null;
  quote_id: string | null;
  booking_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  destination: string | null;
  city: string | null;
  check_in: string | null;
  check_out: string | null;
  approx_dates: string | null;
  adults: number | null;
  children_count: number;
  children_ages: number[];
  rooms: number | null;
  occupancy: string | null;
  service_type: string | null;
  nationality: string | null;
  market: string | null;
  budget_level: string | null;
  budget_amount: number | null;
  priorities: string | null;
  reference_hotel: string | null;
  reference_screenshot_url: string | null;
  special_requests: string | null;
  lead_source: string | null;
  campaign: string | null;
  arrived_at: string;
  first_response_at: string | null;
  payment_policy: string;
  deposit_percent: number | null;
  lost_reason: string | null;
  requote_required: boolean;
  is_legacy: boolean;
  created_at: string;
  updated_at: string;
}

export interface SopPricingRequest {
  id: string;
  organization_id: string;
  lead_id: string | null;
  quote_id: string | null;
  status: string;
  brief: Record<string, unknown>;
  notes: string | null;
  recommendation: string | null;
  price_valid_until: string | null;
  requested_at: string;
  quoted_at: string | null;
  recheck_requested_at: string | null;
  recheck_completed_at: string | null;
  recheck_changed: boolean | null;
  recheck_notes: string | null;
  assigned_to: string | null;
}

export interface SopPricingOption {
  id: string;
  pricing_request_id: string;
  option_index: number;
  supplier_id: string | null;
  supplier_name: string | null;
  product_name: string | null;
  net_cost: number;
  currency: string;
  markup_type: string;
  markup_value: number;
  selling_price: number;
  cancellation_policy: string | null;
  payment_deadline: string | null;
  cancellation_deadline: string | null;
  release_deadline: string | null;
  is_recommended: boolean;
  is_selected: boolean;
  notes: string | null;
}

export interface SopHandover {
  id: string;
  handover_type: SopHandoverType;
  lead_id: string | null;
  booking_id: string | null;
  checklist: Record<string, boolean>;
  missing_items: string[];
  is_complete: boolean;
  accepted_at: string | null;
  from_user_id: string | null;
  to_user_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface SopApproval {
  id: string;
  approval_type: SopApprovalType;
  status: 'pending' | 'approved' | 'rejected';
  lead_id: string | null;
  booking_id: string | null;
  amount: number | null;
  reason: string | null;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface SopDeadline {
  id: string;
  deadline_type: string;
  booking_id: string | null;
  lead_id: string | null;
  due_at: string;
  status: string;
  owner_id: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface SopIncident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  owner_id: string | null;
  booking_id: string | null;
  lead_id: string | null;
  customer_id: string | null;
  next_update_at: string | null;
  escalation_level: number;
  escalated_to: SopDepartment | null;
  resolution: string | null;
  created_at: string;
}

export interface SopPostTripAction {
  id: string;
  booking_id: string | null;
  lead_id: string | null;
  action_type: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  rating: number | null;
  feedback: string | null;
}

export interface SopDepartmentMember {
  id: string;
  user_id: string;
  department: SopDepartment;
  is_available: boolean;
  specializations: string[];
  last_assigned_at: string | null;
  active_load: number;
}

/** Turns a gate result into a readable Arabic toast and returns whether it passed. */
export const reportGate = (res: GateResult | null | undefined, okMessage?: string) => {
  if (!res) return false;
  if (res.allowed) {
    if (okMessage) toast.success(okMessage);
    return true;
  }
  const parts = [
    ...(res.violations || []).map(labelViolation),
    ...(res.missing_fields || []).map((m) => `ناقص: ${labelMissing(m)}`),
  ];
  toast.error(parts.length ? parts.join(' • ') : 'الإجراء غير مسموح');
  return false;
};

const invalidateSop = (qc: ReturnType<typeof useQueryClient>) => {
  ['sop-leads', 'sop-lead', 'sop-pricing-requests', 'sop-pricing-request', 'sop-handovers',
   'sop-approvals', 'sop-deadlines', 'sop-incidents', 'sop-post-trip', 'sop-compliance',
   'sop-kpis', 'sop-assignments', 'workflow-progress', 'booking-workspace']
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
};

/* ------------------------------------------------------------------ realtime */

export function useSopRealtime() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  useEffect(() => {
    if (!orgId) return;
    const channel = db
      .channel(`sop-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sop_leads' }, () => invalidateSop(qc))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sop_pricing_requests' }, () => invalidateSop(qc))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sop_handovers' }, () => invalidateSop(qc))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sop_approvals' }, () => invalidateSop(qc))
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [orgId, qc]);
}

/* ------------------------------------------------------------------ departments */

export function useSopDepartmentMembers(department?: SopDepartment) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-department-members', orgId, department],
    enabled: !!orgId,
    queryFn: async () => {
      let q = db.from('sop_department_members').select('*').eq('organization_id', orgId);
      if (department) q = q.eq('department', department);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SopDepartmentMember[];
    },
  });
}

export function useMyDepartments() {
  const orgId = useOrgId();
  const { user, hasRole } = useOptimizedAuth();
  const query = useQuery({
    queryKey: ['sop-my-departments', orgId, user?.id],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from('sop_department_members')
        .select('department')
        .eq('organization_id', orgId)
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data || []).map((d: any) => d.department as SopDepartment);
    },
  });
  const isManager = hasRole?.('owner') || hasRole?.('admin') || hasRole?.('manager') || false;
  const departments = query.data || [];
  return {
    departments,
    isManager,
    isLoading: query.isLoading,
    has: (d: SopDepartment) => isManager || departments.includes(d),
  };
}

export function useUpsertDepartmentMember() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: { user_id: string; department: SopDepartment; is_available?: boolean; specializations?: string[] }) => {
      const { error } = await db.from('sop_department_members').upsert(
        { organization_id: orgId, ...input },
        { onConflict: 'organization_id,user_id,department' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث عضوية القسم');
      qc.invalidateQueries({ queryKey: ['sop-department-members'] });
      qc.invalidateQueries({ queryKey: ['sop-my-departments'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useRemoveDepartmentMember() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: { user_id: string; department: SopDepartment }) => {
      const { error } = await db
        .from('sop_department_members')
        .delete()
        .eq('organization_id', orgId)
        .eq('user_id', input.user_id)
        .eq('department', input.department);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إزالة العضو من القسم');
      qc.invalidateQueries({ queryKey: ['sop-department-members'] });
      qc.invalidateQueries({ queryKey: ['sop-my-departments'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------------------------ leads */

interface LeadFilters {
  stages?: SopLeadStage[];
  ownerId?: string;
  includeLegacy?: boolean;
  search?: string;
}

export function useSopLeads(filters: LeadFilters = {}) {
  const orgId = useOrgId();
  const { stages, ownerId, includeLegacy = false, search } = filters;
  return useQuery({
    queryKey: ['sop-leads', orgId, stages, ownerId, includeLegacy, search],
    enabled: !!orgId,
    queryFn: async () => {
      let q = db.from('sop_leads').select('*').eq('organization_id', orgId)
        .order('updated_at', { ascending: false }).limit(500);
      if (!includeLegacy) q = q.eq('is_legacy', false);
      if (stages?.length) q = q.in('stage', stages);
      if (ownerId) q = q.eq('current_owner_id', ownerId);
      if (search) q = q.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%,destination.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SopLead[];
    },
  });
}

export function useSopLead(id?: string | null) {
  return useQuery({
    queryKey: ['sop-lead', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from('sop_leads').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as SopLead | null;
    },
  });
}

export function useSopLeadForBooking(bookingId?: string | null) {
  return useQuery({
    queryKey: ['sop-lead', 'booking', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await db.from('sop_leads').select('*')
        .eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1);
      if (error) throw error;
      return ((data || [])[0] || null) as SopLead | null;
    },
  });
}

export function useSopLeadForConversation(conversationId?: string | null) {
  return useQuery({
    queryKey: ['sop-lead', 'conversation', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await db.from('sop_leads').select('*')
        .eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(1);
      if (error) throw error;
      return ((data || [])[0] || null) as SopLead | null;
    },
  });
}

export function useSaveSopLead() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  return useMutation({
    mutationFn: async (input: Partial<SopLead> & { id?: string }) => {
      const { id, ...values } = input;
      if (id) {
        const { data, error } = await db.from('sop_leads').update(values).eq('id', id).select().maybeSingle();
        if (error) throw error;
        return data as SopLead;
      }
      const { data, error } = await db.from('sop_leads')
        .insert({ ...values, organization_id: orgId, created_by: user?.id ?? null })
        .select().maybeSingle();
      if (error) throw error;
      return data as SopLead;
    },
    onSuccess: () => { toast.success('تم الحفظ'); invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل الحفظ: ' + (e?.message || 'خطأ')),
  });
}

/** Server-side gate preview — the same result the transition itself would return. */
export function useTransitionCheck(leadId?: string | null, to?: SopLeadStage) {
  return useQuery({
    queryKey: ['sop-gate', leadId, to],
    enabled: !!leadId && !!to,
    queryFn: async (): Promise<GateResult> => {
      const { data, error } = await db.rpc('sop_validate_transition', { _lead: leadId, _to: to });
      if (error) throw error;
      return data as GateResult;
    },
    staleTime: 5_000,
  });
}

export function useAdvanceLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadId: string; to: SopLeadStage; reason?: string }) => {
      const { data, error } = await db.rpc('sop_advance_lead', {
        _lead: input.leadId, _to: input.to, _reason: input.reason ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم تحديث المرحلة')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------------------------ assignment */

export function useLeadAssignments(leadId?: string | null) {
  return useQuery({
    queryKey: ['sop-assignments', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await db.from('sop_lead_assignments').select('*')
        .eq('lead_id', leadId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadId: string; assignee?: string; exceptionReason?: string }) => {
      const { data, error } = await db.rpc('sop_assign_lead', {
        _lead: input.leadId,
        _assignee: input.assignee ?? null,
        _exception_reason: input.exceptionReason ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم الإسناد')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل الإسناد: ' + (e?.message || 'خطأ')),
  });
}

export function useAcknowledgeAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await db.rpc('sop_acknowledge_assignment', { _lead: leadId });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم استلام الإسناد')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useReassignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadId: string; assignee: string; reason: string }) => {
      const { data, error } = await db.rpc('sop_reassign_lead', {
        _lead: input.leadId, _assignee: input.assignee, _reason: input.reason,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تمت إعادة الإسناد')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------------------------ handovers */

export function useHandovers(leadId?: string | null) {
  return useQuery({
    queryKey: ['sop-handovers', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await db.from('sop_handovers').select('*')
        .eq('lead_id', leadId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SopHandover[];
    },
  });
}

export function useCompleteHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      leadId: string; type: SopHandoverType; checklist: Record<string, boolean>;
      toUser?: string | null; notes?: string;
    }) => {
      const { data, error } = await db.rpc('sop_complete_handover', {
        _lead: input.leadId, _type: input.type, _checklist: input.checklist,
        _to_user: input.toUser ?? null, _notes: input.notes ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { reportGate(res, 'تم تسجيل التسليم مكتملاً'); invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------------------------ pricing */

export function usePricingRequests(filters: { leadId?: string | null; status?: string } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-pricing-requests', orgId, filters.leadId, filters.status],
    enabled: !!orgId,
    queryFn: async () => {
      let q = db.from('sop_pricing_requests').select('*').eq('organization_id', orgId)
        .eq('is_legacy', false).order('created_at', { ascending: false }).limit(300);
      if (filters.leadId) q = q.eq('lead_id', filters.leadId);
      if (filters.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SopPricingRequest[];
    },
  });
}

export function usePricingOptions(requestId?: string | null) {
  return useQuery({
    queryKey: ['sop-pricing-options', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await db.from('sop_pricing_options').select('*')
        .eq('pricing_request_id', requestId).order('option_index');
      if (error) throw error;
      return (data || []) as SopPricingOption[];
    },
  });
}

export function useCreatePricingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadId: string; notes?: string }) => {
      const { data, error } = await db.rpc('sop_create_pricing_request', {
        _lead: input.leadId, _notes: input.notes ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم إرسال طلب التسعير للحجوزات')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useSavePricingOption() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: Partial<SopPricingOption> & { pricing_request_id: string }) => {
      const { id, ...values } = input as any;
      if (id) {
        const { error } = await db.from('sop_pricing_options').update(values).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await db.from('sop_pricing_options')
          .insert({ ...values, organization_id: orgId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('تم حفظ الخيار');
      qc.invalidateQueries({ queryKey: ['sop-pricing-options'] });
    },
    onError: (e: any) => toast.error('فشل الحفظ: ' + (e?.message || 'خطأ')),
  });
}

export function useDeletePricingOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('sop_pricing_options').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['sop-pricing-options'] });
    },
    onError: (e: any) => toast.error('فشل الحذف: ' + (e?.message || 'خطأ')),
  });
}

export function usePublishPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; validUntil?: string | null; recommendation?: string }) => {
      const { data, error } = await db.rpc('sop_publish_pricing', {
        _request: input.requestId,
        _valid_until: input.validUntil ?? null,
        _recommendation: input.recommendation ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم إنشاء عرض السعر وإرساله للمبيعات')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useRequestRecheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadId: string; notes?: string }) => {
      const { data, error } = await db.rpc('sop_request_recheck', {
        _lead: input.leadId, _notes: input.notes ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم طلب إعادة التأكد')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useCompleteRecheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; changed: boolean; notes?: string }) => {
      const { data, error } = await db.rpc('sop_complete_recheck', {
        _request: input.requestId, _changed: input.changed, _notes: input.notes ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res: any) => {
      if (res?.allowed) {
        toast[res.changed ? 'warning' : 'success'](
          res.changed ? 'تغيّر السعر/الإتاحة — مطلوب إعادة تسعير قبل التحصيل' : 'تم التأكد: السعر والإتاحة ثابتان',
        );
        invalidateSop(qc);
      } else reportGate(res);
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------------------------ approvals */

export function useSopApprovals(filters: { leadId?: string | null; status?: string } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-approvals', orgId, filters.leadId, filters.status],
    enabled: !!orgId,
    queryFn: async () => {
      let q = db.from('sop_approvals').select('*').eq('organization_id', orgId)
        .order('created_at', { ascending: false }).limit(300);
      if (filters.leadId) q = q.eq('lead_id', filters.leadId);
      if (filters.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SopApproval[];
    },
  });
}

export function useRequestApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      type: SopApprovalType; leadId?: string | null; bookingId?: string | null;
      amount?: number | null; reason?: string;
    }) => {
      const { data, error } = await db.rpc('sop_request_approval', {
        _type: input.type, _lead: input.leadId ?? null, _booking: input.bookingId ?? null,
        _amount: input.amount ?? null, _reason: input.reason ?? null,
        _supplier_payment_order: null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم إرسال طلب الموافقة للإدارة')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { approvalId: string; approve: boolean; note?: string }) => {
      const { data, error } = await db.rpc('sop_decide_approval', {
        _approval: input.approvalId, _approve: input.approve, _note: input.note ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم تسجيل القرار')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------------------------ collection */

export function useCollectionStatus(leadId?: string | null) {
  return useQuery({
    queryKey: ['sop-collection', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await db.rpc('sop_collection_status', { _lead: leadId });
      if (error) throw error;
      return data as GateResult['collection'];
    },
    staleTime: 10_000,
  });
}

export function useConfirmBookingSop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await db.rpc('sop_on_booking_confirmed', { _lead: leadId });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => {
      if (reportGate(res, 'تم تفعيل مواعيد التشغيل والأتمتة')) invalidateSop(qc);
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------------------------ deadlines / incidents / post-trip */

export function useOperationalDeadlines(filters: { bookingId?: string | null; openOnly?: boolean } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-deadlines', orgId, filters.bookingId, filters.openOnly],
    enabled: !!orgId,
    queryFn: async () => {
      let q = db.from('sop_operational_deadlines').select('*').eq('organization_id', orgId)
        .eq('is_legacy', false).order('due_at', { ascending: true }).limit(300);
      if (filters.bookingId) q = q.eq('booking_id', filters.bookingId);
      if (filters.openOnly) q = q.eq('status', 'open');
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SopDeadline[];
    },
  });
}

export function useCompleteDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('sop_operational_deadlines')
        .update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('تم الإغلاق'); qc.invalidateQueries({ queryKey: ['sop-deadlines'] }); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useIncidents(filters: { openOnly?: boolean; bookingId?: string | null } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-incidents', orgId, filters.openOnly, filters.bookingId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = db.from('sop_incidents').select('*').eq('organization_id', orgId)
        .order('created_at', { ascending: false }).limit(300);
      if (filters.openOnly) q = q.neq('status', 'resolved');
      if (filters.bookingId) q = q.eq('booking_id', filters.bookingId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SopIncident[];
    },
  });
}

export function useSaveIncident() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  return useMutation({
    mutationFn: async (input: Partial<SopIncident> & { id?: string }) => {
      const { id, ...values } = input;
      if (id) {
        const { error } = await db.from('sop_incidents').update(values).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await db.from('sop_incidents')
          .insert({ ...values, organization_id: orgId, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('تم الحفظ'); qc.invalidateQueries({ queryKey: ['sop-incidents'] }); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function usePostTripActions(filters: { bookingId?: string | null; pendingOnly?: boolean } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-post-trip', orgId, filters.bookingId, filters.pendingOnly],
    enabled: !!orgId,
    queryFn: async () => {
      let q = db.from('sop_post_trip_actions').select('*').eq('organization_id', orgId)
        .eq('is_legacy', false).order('due_at', { ascending: true }).limit(300);
      if (filters.bookingId) q = q.eq('booking_id', filters.bookingId);
      if (filters.pendingOnly) q = q.eq('status', 'pending');
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SopPostTripAction[];
    },
  });
}

export function useUpdatePostTripAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: string; rating?: number; feedback?: string }) => {
      const { id, ...values } = input;
      const { error } = await db.from('sop_post_trip_actions')
        .update({ ...values, completed_at: values.status === 'done' ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries({ queryKey: ['sop-post-trip'] }); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------------------------ reporting */

export interface ComplianceReport {
  unowned_leads: any[];
  incomplete_intake: any[];
  ack_sla_breaches: any[];
  incomplete_handovers: any[];
  requote_required: any[];
  stuck_leads: any[];
  overdue_deadlines: any[];
  overdue_incidents: any[];
  pending_approvals: any[];
}

export function useSopCompliance() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-compliance', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await db.rpc('sop_compliance_report', { p_org: orgId });
      if (error) throw error;
      return data as ComplianceReport;
    },
    refetchInterval: 60_000,
  });
}

export function useDepartmentKpis(from?: string, to?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-kpis', orgId, from, to],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await db.rpc('sop_department_kpis', {
        p_org: orgId, p_from: from ?? null, p_to: to ?? null,
      });
      if (error) throw error;
      return data as {
        range: { from: string; to: string };
        customer_service: Record<string, number>;
        sales: Record<string, number>;
        reservations: Record<string, number>;
      };
    },
  });
}

/* ------------------------------------------------------------------ org policy */

export function useSopPolicy() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['sop-policy', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await db.from('sop_org_policies').select('*')
        .eq('organization_id', orgId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveSopPolicy() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await db.from('sop_org_policies')
        .upsert({ organization_id: orgId, ...values }, { onConflict: 'organization_id' });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('تم حفظ السياسات'); qc.invalidateQueries({ queryKey: ['sop-policy'] }); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}
