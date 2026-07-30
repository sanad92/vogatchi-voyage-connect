import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

const sb = supabase as any;

export const RECOVERY_START_DATE = '2022-05-22';

export interface GapRow {
  booking_id: string;
  booking_number: string | null;
  created_on: string;
  workflow_stage: string;
  customer_id: string | null;
  supplier_id: string | null;
  selling_price: number | null;
  cost_price: number | null;
  currency: string;
  missing_invoice: boolean;
  missing_supplier_po: boolean;
  missing_voucher: boolean;
  missing_snapshot: boolean;
  missing_automation_run: boolean;
  missing_timeline: boolean;
  missing_workflow_history: boolean;
  missing_events: boolean;
  missing_gl: boolean;
  no_customer: boolean;
  no_supplier: boolean;
  zero_price: boolean;
  negative_margin: boolean;
  gap_count: number;
}

export interface RecoveryRun {
  id: string;
  mode: 'audit' | 'simulate' | 'execute' | 'gl_replay';
  from_date: string;
  to_date: string;
  status: string;
  totals: Record<string, any>;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface RecoveryItem {
  id: string;
  run_id: string;
  booking_id: string | null;
  booking_number: string | null;
  entity_type: string;
  action: 'created' | 'skipped' | 'would_create' | 'failed' | 'verified';
  detail: string | null;
  error_message: string | null;
  created_at: string;
}

export interface FiscalClosure {
  id: string;
  fiscal_year: number;
  period_start: string;
  period_end: string;
  status: 'open' | 'reconciled' | 'closed';
  reconciliation: Record<string, any>;
  reconciled_at: string | null;
  closed_at: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
}

export const fiscalYears = () => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2022; y <= current; y++) years.push(y);
  return years;
};

export const yearRange = (year: number) => {
  const today = new Date().toISOString().slice(0, 10);
  const start = year === 2022 ? RECOVERY_START_DATE : `${year}-01-01`;
  const end = `${year}-12-31` > today ? today : `${year}-12-31`;
  return { start, end };
};

/** Phase 1 — read-only gap audit */
export const useHistoricalGaps = (from: string, to: string, enabled = true) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['historical-gaps', orgId, from, to],
    enabled: !!orgId && enabled,
    queryFn: async (): Promise<GapRow[]> => {
      const { data, error } = await sb.rpc('audit_historical_gaps', { _org: orgId, _from: from, _to: to });
      if (error) throw error;
      return (data || []) as GapRow[];
    },
  });
};

export const useHistoricalSummary = (from: string, to: string, enabled = true) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['historical-summary', orgId, from, to],
    enabled: !!orgId && enabled,
    queryFn: async () => {
      const { data, error } = await sb.rpc('audit_historical_summary', {
        _org: orgId, _from: from, _to: to, _log: false,
      });
      if (error) throw error;
      return data as Record<string, any>;
    },
  });
};

export const useRecoveryRuns = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['recovery-runs', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<RecoveryRun[]> => {
      const { data, error } = await sb.from('historical_recovery_runs')
        .select('*').eq('organization_id', orgId)
        .order('started_at', { ascending: false }).limit(30);
      if (error) throw error;
      return (data || []) as RecoveryRun[];
    },
  });
};

export const useRecoveryItems = (runId?: string | null) =>
  useQuery({
    queryKey: ['recovery-items', runId],
    enabled: !!runId,
    queryFn: async (): Promise<RecoveryItem[]> => {
      const { data, error } = await sb.from('historical_recovery_items')
        .select('*').eq('run_id', runId).order('created_at', { ascending: true }).limit(1000);
      if (error) throw error;
      return (data || []) as RecoveryItem[];
    },
  });

export const useFiscalClosures = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['fiscal-closures', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<FiscalClosure[]> => {
      const { data, error } = await sb.from('fiscal_year_closures')
        .select('*').eq('organization_id', orgId).order('fiscal_year', { ascending: false });
      if (error) throw error;
      return (data || []) as FiscalClosure[];
    },
  });
};

/** Phase 2 — idempotent backfill (simulate or execute) */
export const useRunBackfill = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { from: string; to: string; dryRun: boolean; limit?: number }) => {
      const { data, error } = await sb.rpc('backfill_historical_bookings', {
        _org: orgId, _from: args.from, _to: args.to, _dry_run: args.dryRun, _limit: args.limit ?? 500,
      });
      if (error) throw error;
      return data as Record<string, any>;
    },
    onSuccess: (res, v) => {
      qc.invalidateQueries({ queryKey: ['recovery-runs'] });
      qc.invalidateQueries({ queryKey: ['historical-gaps'] });
      qc.invalidateQueries({ queryKey: ['historical-summary'] });
      toast.success(
        v.dryRun
          ? `محاكاة: ${res.simulated} حجز يحتاج إصلاح من ${res.processed}`
          : `تم الإصلاح: ${res.created} حجز، تخطي ${res.skipped}، فشل ${res.failed}`
      );
    },
    onError: (e: any) => toast.error(e.message),
  });
};

/** Phase 3 — GL replay */
export const useReplayGL = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { from: string; to: string; dryRun: boolean }) => {
      const { data, error } = await sb.rpc('replay_gl_postings', {
        _org: orgId, _from: args.from, _to: args.to, _dry_run: args.dryRun,
      });
      if (error) throw error;
      return data as Record<string, any>;
    },
    onSuccess: (res, v) => {
      qc.invalidateQueries();
      toast.success(v.dryRun
        ? `محاكاة: ${res.invoices_pending_posting} فاتورة بحاجة للترحيل`
        : `تم ترحيل القيود: فواتير ${res.invoices_posted}, مدفوعات عملاء ${res.customer_payments_posted}`);
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useFiscalReconciliation = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (year: number) => {
      const { data, error } = await sb.rpc('fiscal_year_reconciliation', { _org: orgId, _year: year });
      if (error) throw error;
      return data as Record<string, any>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-closures'] });
      toast.success('تم إنشاء تقرير المطابقة السنوي');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useCloseFiscalYear = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { year: number; confirmation: string }) => {
      const { data, error } = await sb.rpc('close_fiscal_year', {
        _org: orgId, _year: args.year, _confirmation: args.confirmation,
      });
      if (error) throw error;
      return data as Record<string, any>;
    },
    onSuccess: (_res, v) => {
      qc.invalidateQueries({ queryKey: ['fiscal-closures'] });
      toast.success(`تم إقفال السنة المالية ${v.year}`);
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useReopenFiscalYear = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { year: number; reason: string }) => {
      const { data, error } = await sb.rpc('reopen_fiscal_year', {
        _org: orgId, _year: args.year, _reason: args.reason,
      });
      if (error) throw error;
      return data as Record<string, any>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-closures'] });
      toast.success('تم إعادة فتح السنة المالية');
    },
    onError: (e: any) => toast.error(e.message),
  });
};
