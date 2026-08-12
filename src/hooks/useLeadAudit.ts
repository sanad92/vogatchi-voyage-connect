import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import type { SopDepartment, SopLeadStage } from '@/lib/sop';

const db = supabase as any;

export interface LeadAuditEntry {
  id: string;
  action: string;
  from_stage: SopLeadStage | null;
  to_stage: SopLeadStage | null;
  actor_user_id: string | null;
  actor_name: string | null;
  reason: string | null;
  source: string;
  is_reconstructed: boolean;
  pricing_request_id: string | null;
  quote_id: string | null;
  booking_id: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  next_at: string | null;
  /** Time spent in this step before the next one (or until now when open). */
  duration_minutes: number;
  is_open: boolean;
}

export interface LeadCycleFilters {
  from?: string;
  to?: string;
  department?: SopDepartment | null;
  employee?: string | null;
  stage?: SopLeadStage | null;
  source?: string | null;
  outcome?: 'booked' | 'lost' | 'open' | null;
  includeLegacy?: boolean;
}

export interface LeadCycleRow {
  lead_id: string;
  lead_number: string | null;
  contact_name: string | null;
  stage: SopLeadStage;
  owner_department: SopDepartment;
  lead_source: string | null;
  is_legacy: boolean;
  owner_name: string | null;
  t_created: string | null;
  t_first_response: string | null;
  t_intake: string | null;
  t_claimed: string | null;
  t_pricing_req: string | null;
  t_pricing_claim: string | null;
  t_pricing_done: string | null;
  t_accepted: string | null;
  t_recheck_done: string | null;
  t_booked: string | null;
  first_response_minutes: number | null;
  intake_minutes: number | null;
  wait_sales_claim_minutes: number | null;
  sales_handling_minutes: number | null;
  reservations_queue_minutes: number | null;
  pricing_turnaround_minutes: number | null;
  decision_minutes: number | null;
  recheck_minutes: number | null;
  total_minutes: number | null;
  age_minutes: number | null;
  events: number;
}

export interface CycleKpi {
  count: number; avg: number | null; median: number | null; p90: number | null;
  breached: number; sla: number | null;
}

export interface LeadCycleReport {
  leads: LeadCycleRow[];
  kpis: Record<string, CycleKpi>;
  employees: { actor_user_id: string; actor_name: string | null; action: string; actions: number; avg_minutes_from_entry: number | null }[];
  coverage: {
    leads: number; with_history: number; coverage_percent: number;
    missing_created: number; missing_claim: number; missing_pricing: number;
  };
}

/** Full audit timeline of one lead, with per-step durations computed server-side. */
export function useLeadAuditTimeline(leadId?: string | null) {
  return useQuery({
    queryKey: ['lead-audit-timeline', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await db.rpc('sop_lead_timeline', { _lead: leadId });
      if (error) throw error;
      return (data || []) as LeadAuditEntry[];
    },
  });
}

export function useLeadCycleReport(filters: LeadCycleFilters) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['lead-cycle-report', orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await db.rpc('sop_lead_cycle_report', {
        p_org: orgId,
        p_from: filters.from,
        p_to: filters.to,
        p_department: filters.department || null,
        p_employee: filters.employee || null,
        p_stage: filters.stage || null,
        p_source: filters.source || null,
        p_outcome: filters.outcome || null,
        p_include_legacy: !!filters.includeLegacy,
      });
      if (error) throw error;
      return data as LeadCycleReport;
    },
  });
}

/** Live refresh whenever a new audit row lands for this organization. */
export function useLeadAuditRealtime() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  useEffect(() => {
    if (!orgId) return;
    const channel = db
      .channel(`lead-audit-${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sop_lead_stage_history', filter: `organization_id=eq.${orgId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['lead-audit-timeline'] });
          qc.invalidateQueries({ queryKey: ['lead-cycle-report'] });
        },
      )
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [orgId, qc]);
}
