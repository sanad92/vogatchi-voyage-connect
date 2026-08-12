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
import { labelMissing, labelViolation, VIOLATION_GUIDANCE, DEPARTMENT_LABELS } from '@/lib/sop';

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
  // Stay details (additive — existing rows may be null)
  hotel_name: string | null;
  destination: string | null;
  check_in: string | null;
  check_out: string | null;
  room_type: string | null;
  room_view: string | null;
  meal_plan: string | null;
  rooms_count: number | null;
  // Benchmarks
  ota_price: number | null;
  ota_source: string | null;
  hotel_direct_price: number | null;
  // Structured cancellation
  cancellation_type: string | null;
  free_cancellation_until: string | null;
  cancellation_charge_model: string | null;
  cancellation_charge_value: number | null;
  cancellation_notes: string | null;
  // Rate validity (per offer)
  price_valid_until: string | null;
  // Transfer
  transfer_status: string | null;
  transfer_type: string | null;
  transfer_net_cost: number | null;
  transfer_selling_price: number | null;
  transfer_notes: string | null;
  // Recommendation
  recommendation_reason: string | null;
  recommendation_note: string | null;
  // Reservations + Management only
  internal_notes: string | null;
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
  const violations = res.violations || [];
  const parts = [
    ...violations.map(labelViolation),
    ...(res.missing_fields || []).map((m) => `ناقص: ${labelMissing(m)}`),
  ];
  const guidance = violations.map((v) => VIOLATION_GUIDANCE[v]).filter(Boolean);

  const depts = Array.isArray(res.my_departments) ? (res.my_departments as SopDepartment[]) : [];
  const context = depts.length
    ? `قسمك الحالي: ${depts.map((d) => DEPARTMENT_LABELS[d] ?? d).join('، ')}`
    : violations.some((v) => v.startsWith('not_')) ? 'حسابك غير مسجّل في أي قسم' : '';

  toast.error(parts.length ? parts.join(' • ') : 'الإجراء غير مسموح', {
    description: [context, ...guidance].filter(Boolean).join(' — ') || undefined,
  });
  return false;
};


const invalidateSop = (qc: ReturnType<typeof useQueryClient>) => {
  ['sop-leads', 'sop-lead', 'sop-pricing-requests', 'sop-pricing-request', 'sop-pricing-options', 'sop-handovers',
   'sop-approvals', 'sop-deadlines', 'sop-incidents', 'sop-post-trip', 'sop-compliance',
   'sop-kpis', 'sop-assignments', 'sop-handover-inbox', 'sop-my-assignments',
   'workflow-progress', 'booking-workspace']
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sop_lead_assignments' }, () => invalidateSop(qc))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sop_department_members' }, () => {
        invalidateSop(qc);
        qc.invalidateQueries({ queryKey: ['sop-department-members'] });
      })
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

export interface MySopMembership {
  department: SopDepartment;
  is_available: boolean;
}

/** Current user's SOP departments together with their availability flag. */
export function useMySopMemberships() {
  const orgId = useOrgId();
  const { user, hasRole } = useOptimizedAuth();
  const query = useQuery({
    queryKey: ['sop-my-memberships', orgId, user?.id],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from('sop_department_members')
        .select('department, is_available')
        .eq('organization_id', orgId)
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        department: d.department as SopDepartment,
        is_available: d.is_available !== false,
      })) as MySopMembership[];
    },
  });
  const isManager = hasRole?.('owner') || hasRole?.('admin') || hasRole?.('manager') || false;
  return { memberships: query.data || [], isManager, isLoading: query.isLoading };
}

/** Staff toggles their own availability inside a department they belong to. */
export function useSetMyAvailability() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: { department: SopDepartment; is_available: boolean }) => {
      const { data, error } = await db.rpc('sop_set_my_availability', {
        _org: orgId,
        _department: input.department,
        _available: input.is_available,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => {
      if (!reportGate(res, 'تم تحديث حالتك')) return;
      qc.invalidateQueries({ queryKey: ['sop-my-memberships'] });
      qc.invalidateQueries({ queryKey: ['sop-my-departments'] });
      qc.invalidateQueries({ queryKey: ['sop-department-members'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
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

/** Admin-only department transfer (audited, resets round-robin fairness on move). */
export function useSetSopDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; department: SopDepartment | null; is_available?: boolean; reason?: string }) => {
      const { data, error } = await db.rpc('sop_set_department' as any, {
        _user_id: input.user_id,
        _department: input.department,
        _is_available: input.is_available ?? true,
        _reason: input.reason ?? null,
      } as any);
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => {
      if (!reportGate(res, 'تم تحديث قسم الموظف')) return;
      qc.invalidateQueries({ queryKey: ['sop-department-members'] });
      qc.invalidateQueries({ queryKey: ['sop-my-departments'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/** Admin-only availability toggle (audited). */
export function useSetSopAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; is_available: boolean; reason?: string }) => {
      const { data, error } = await db.rpc('sop_set_availability' as any, {
        _user_id: input.user_id,
        _is_available: input.is_available,
        _reason: input.reason ?? null,
      } as any);
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => {
      if (!reportGate(res, 'تم تحديث حالة التوفر')) return;
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
    // The editor holds unsaved user input — never refetch under the user's hands.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

/** Exact DB error text — code, message, details and hint — instead of a generic toast. */
const dbErrorText = (e: any) =>
  [e?.message, e?.details, e?.hint, e?.code ? `(${e.code})` : null]
    .filter(Boolean).join(' — ') || 'خطأ غير معروف';

/** Columns the pricing editor is allowed to write. Anything else is dropped. */
export const PRICING_OPTION_COLUMNS = [
  'option_index', 'supplier_id', 'supplier_name', 'product_name', 'net_cost', 'currency',
  'markup_type', 'markup_value', 'selling_price', 'cancellation_policy', 'payment_deadline',
  'cancellation_deadline', 'release_deadline', 'is_recommended', 'is_selected', 'notes',
  'hotel_name', 'destination', 'check_in', 'check_out', 'room_type', 'room_view', 'meal_plan',
  'rooms_count', 'ota_price', 'ota_source', 'hotel_direct_price', 'cancellation_type',
  'free_cancellation_until', 'cancellation_charge_model', 'cancellation_charge_value',
  'cancellation_notes', 'price_valid_until', 'transfer_status', 'transfer_type',
  'transfer_net_cost', 'transfer_selling_price', 'transfer_notes', 'recommendation_reason',
  'recommendation_note', 'internal_notes',
] as const;

const pickOptionColumns = (values: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const k of PRICING_OPTION_COLUMNS) if (k in values) out[k] = values[k];
  return out;
};

export function useSavePricingOption() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: Partial<SopPricingOption> & { pricing_request_id: string }) => {
      const { id, pricing_request_id, ...rest } = input as any;
      const values = pickOptionColumns(rest);
      if (id) {
        // return=representation proves the row really changed (an RLS-blocked
        // update returns zero rows instead of raising).
        const { data, error } = await db.from('sop_pricing_options')
          .update(values).eq('id', id).select('*');
        if (error) throw error;
        if (!data || !data.length) {
          throw new Error('لم يتم حفظ أي صف — صلاحيات التعديل غير كافية على هذا العرض');
        }
        return data[0] as SopPricingOption;
      }
      const { data, error } = await db.from('sop_pricing_options')
        .insert({ ...values, pricing_request_id, organization_id: orgId })
        .select('*');
      if (error) throw error;
      return (data?.[0] || null) as SopPricingOption | null;
    },
    onSuccess: () => {
      toast.success('تم حفظ العرض');
      qc.invalidateQueries({ queryKey: ['sop-pricing-options'] });
    },
    onError: (e: any) => toast.error('فشل الحفظ: ' + dbErrorText(e)),
  });
}

export function useDeletePricingOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db.from('sop_pricing_options').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('لم يتم الحذف — الحذف متاح لقسم الحجوزات فقط');
    },
    onSuccess: () => {
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['sop-pricing-options'] });
    },
    onError: (e: any) => toast.error('فشل الحذف: ' + dbErrorText(e)),
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
    onSuccess: (res) => {
      if (reportGate(res as any, 'تم إنشاء عرض السعر وإرجاع الطلب لمسؤول المبيعات')) invalidateSop(qc);
    },

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

/* ------------------------------------------------------------------ handover inbox */

export interface HandoverInboxItem extends SopHandover {
  organization_id: string;
  from_department: SopDepartment | null;
  to_department: SopDepartment | null;
  lead?: { id: string; contact_name: string | null; destination: string | null; stage: SopLeadStage } | null;
}

/** Handovers waiting for me + handovers I sent that are still unaccepted. */
export function useHandoverInbox() {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['sop-handover-inbox', orgId, userId],
    enabled: !!orgId && !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from('sop_handovers')
        .select('*, lead:sop_leads(id, contact_name, destination, stage)')
        .eq('organization_id', orgId)
        .is('accepted_at', null)
        .or(`to_user_id.eq.${userId},from_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data || []) as HandoverInboxItem[];
      return {
        incoming: rows.filter((r) => r.to_user_id === userId),
        outgoing: rows.filter((r) => r.from_user_id === userId && r.to_user_id !== userId),
      };
    },
  });
}

/** Pending assignment acknowledgements for the current user. */
export function useMyPendingAssignments() {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['sop-my-assignments', orgId, userId],
    enabled: !!orgId && !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from('sop_lead_assignments')
        .select('*, lead:sop_leads(id, contact_name, destination, stage)')
        .eq('organization_id', orgId)
        .eq('assignee_id', userId)
        .eq('is_current', true)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

/** Receiving side of a handover: mark it accepted. */
export function useAcceptHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (handoverId: string) => {
      const { error } = await db.from('sop_handovers')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', handoverId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الاستلام');
      invalidateSop(qc);
      qc.invalidateQueries({ queryKey: ['sop-handover-inbox'] });
    },
    onError: (e: any) => toast.error('فشل الاستلام: ' + (e?.message || 'خطأ')),
  });
}

/* ------------------------------------------------- backward moves & claiming */

/** Move a lead back to an earlier stage with a mandatory reason (audited). */
export function useMoveLeadBack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadId: string; to: SopLeadStage; reason: string }) => {
      const { data, error } = await db.rpc('sop_move_back', {
        _lead: input.leadId, _to: input.to, _reason: input.reason,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم إرجاع الملف لمرحلة سابقة')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل الإرجاع: ' + (e?.message || 'خطأ')),
  });
}

/** Mark a lead as unqualified with a reason from the preset list. */
export function useDisqualifyLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadId: string; reason: string; note?: string }) => {
      const { data, error } = await db.rpc('sop_disqualify', {
        _lead: input.leadId, _reason: input.reason, _note: input.note ?? null,
      });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم تعليم العميل كغير مؤهل')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/** Reopen a lost/unqualified lead back into intake. */
export function useReopenLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await db.rpc('sop_reopen_lead', { _lead: leadId });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تمت إعادة فتح الملف')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

/** Sales self-claims a lead from intake — no manual handover needed. */
export function useClaimLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await db.rpc('sop_claim_lead', { _lead: leadId });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'استلمت العميل — دخل خط أنابيب المبيعات')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل الاستلام: ' + (e?.message || 'خطأ')),
  });
}

/** Reservations self-claims a pricing request. */
export function useClaimPricingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await db.rpc('sop_claim_pricing_request', { _request: requestId });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'استلمت طلب التسعير')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل الاستلام: ' + (e?.message || 'خطأ')),
  });
}

/** Reservations sends the published pricing back to Sales. */
export function useReturnToSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await db.rpc('sop_return_to_sales', { _request: requestId });
      if (error) throw error;
      return data as GateResult;
    },
    onSuccess: (res) => { if (reportGate(res, 'تم إرسال التسعير للمبيعات')) invalidateSop(qc); },
    onError: (e: any) => toast.error('فشل الإرسال: ' + (e?.message || 'خطأ')),
  });
}
