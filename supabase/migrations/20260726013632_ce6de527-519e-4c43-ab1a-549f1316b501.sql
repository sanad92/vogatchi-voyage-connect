
-- ============================================================
-- Phase 9: Workflow Engine + Ops Command Center
-- ============================================================

-- 1. Workflow catalog ----------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  aggregate_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workflow_definitions TO authenticated;
GRANT ALL ON public.workflow_definitions TO service_role;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read workflow defs" ON public.workflow_definitions
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  order_index int NOT NULL,
  category text,
  required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(definition_id, key)
);
GRANT SELECT ON public.workflow_stages TO authenticated;
GRANT ALL ON public.workflow_stages TO service_role;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read workflow stages" ON public.workflow_stages
  FOR SELECT TO authenticated USING (true);

-- 2. Workflow rules ------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE, -- null = platform default
  name text NOT NULL,
  description text,
  event_type text NOT NULL,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  action jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_duration_ms int,
  failure_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workflow_rules TO authenticated;
GRANT ALL ON public.workflow_rules TO service_role;
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read own rules" ON public.workflow_rules
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR EXISTS (SELECT 1 FROM public.organization_members m
               WHERE m.organization_id = workflow_rules.organization_id
                 AND m.user_id = auth.uid())
  );
CREATE POLICY "platform admins manage rules" ON public.workflow_rules
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_workflow_rules_event_active
  ON public.workflow_rules(event_type, is_active, priority);

CREATE TABLE IF NOT EXISTS public.workflow_rule_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.workflow_rules(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.domain_events(id) ON DELETE SET NULL,
  organization_id uuid,
  status text NOT NULL,          -- succeeded | failed | skipped
  duration_ms int,
  error text,
  ran_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rule_id, event_id)
);
GRANT SELECT ON public.workflow_rule_runs TO authenticated;
GRANT ALL ON public.workflow_rule_runs TO service_role;
ALTER TABLE public.workflow_rule_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read own runs" ON public.workflow_rule_runs
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR public.is_platform_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.organization_members m
               WHERE m.organization_id = workflow_rule_runs.organization_id
                 AND m.user_id = auth.uid())
  );
CREATE INDEX IF NOT EXISTS idx_workflow_rule_runs_rule ON public.workflow_rule_runs(rule_id, ran_at DESC);

-- 3. Seed booking lifecycle ---------------------------------
INSERT INTO public.workflow_definitions(key, name, aggregate_type)
VALUES ('booking_lifecycle', 'Booking Lifecycle', 'booking')
ON CONFLICT (key) DO NOTHING;

WITH def AS (SELECT id FROM public.workflow_definitions WHERE key='booking_lifecycle')
INSERT INTO public.workflow_stages(definition_id, key, label, order_index, category)
SELECT def.id, s.key, s.label, s.ord, s.cat
FROM def, (VALUES
  ('lead',        'عميل محتمل',        1,  'sales'),
  ('qualified',   'مؤهل',              2,  'sales'),
  ('quoted',      'تم عرض السعر',      3,  'sales'),
  ('confirmed',   'مؤكد',              4,  'finance'),
  ('paid',        'مدفوع',             5,  'finance'),
  ('operations',  'تشغيل',             6,  'ops'),
  ('traveling',   'مسافر',             7,  'ops'),
  ('completed',   'مكتمل',             8,  'ops'),
  ('post_travel', 'ما بعد السفر',      9,  'retention'),
  ('cancelled',   'ملغي',              10, 'terminal')
) AS s(key,label,ord,cat)
ON CONFLICT (definition_id, key) DO NOTHING;

-- 4. Handler + subscription -----------------------------------
CREATE OR REPLACE FUNCTION public.handler_workflow_rules(p_event public.domain_events)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_started timestamptz;
  v_ms int;
BEGIN
  FOR r IN
    SELECT * FROM public.workflow_rules
    WHERE event_type = p_event.event_type
      AND is_active = true
      AND (organization_id IS NULL OR organization_id = p_event.organization_id)
    ORDER BY priority ASC
  LOOP
    v_started := clock_timestamp();
    BEGIN
      -- Minimal action DSL: {"type":"emit","event":"...", "payload":{...}}
      --                     {"type":"advance_stage","to":"..."}
      --                     {"type":"log_only"}
      IF r.action->>'type' = 'emit' THEN
        PERFORM public.emit_event(
          r.action->>'event',
          p_event.aggregate_type,
          p_event.aggregate_id,
          p_event.organization_id,
          coalesce(r.action->'payload','{}'::jsonb) || jsonb_build_object('via_rule', r.id),
          'rule:'||r.id||':'||p_event.id
        );
      ELSIF r.action->>'type' = 'advance_stage'
            AND p_event.aggregate_type = 'booking' THEN
        UPDATE public.bookings
        SET workflow_stage = (r.action->>'to')::booking_workflow_stage
        WHERE id = p_event.aggregate_id;
      END IF;

      v_ms := extract(millisecond from (clock_timestamp() - v_started))::int;
      INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms)
      VALUES (r.id, p_event.id, p_event.organization_id, 'succeeded', v_ms)
      ON CONFLICT (rule_id, event_id) DO NOTHING;
      UPDATE public.workflow_rules
      SET last_run_at = now(), last_duration_ms = v_ms, success_count = success_count + 1, updated_at = now()
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      v_ms := extract(millisecond from (clock_timestamp() - v_started))::int;
      INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms, error)
      VALUES (r.id, p_event.id, p_event.organization_id, 'failed', v_ms, SQLERRM)
      ON CONFLICT (rule_id, event_id) DO UPDATE SET status='failed', error=EXCLUDED.error;
      UPDATE public.workflow_rules
      SET last_run_at = now(), last_duration_ms = v_ms, failure_count = failure_count + 1, updated_at = now()
      WHERE id = r.id;
    END;
  END LOOP;
END;
$$;

-- Extend dispatcher (append the new case, keep all existing ones)
CREATE OR REPLACE FUNCTION public.process_event_deliveries(p_limit integer DEFAULT 100)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_event public.domain_events;
  v_started timestamptz;
  v_processed integer := 0;
BEGIN
  FOR r IN
    SELECT d.id, d.event_id, d.handler_key, d.attempts
    FROM public.event_deliveries d
    WHERE d.status IN ('pending','failed')
      AND d.next_retry_at <= now()
    ORDER BY d.next_retry_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_started := clock_timestamp();
    SELECT * INTO v_event FROM public.domain_events WHERE id = r.event_id;
    BEGIN
      CASE r.handler_key
        WHEN 'timeline'              THEN PERFORM public.handler_timeline_append(v_event);
        WHEN 'automation'            THEN PERFORM public.handler_run_booking_automation(v_event);
        WHEN 'finance'               THEN PERFORM public.handler_finance_post(v_event);
        WHEN 'notify'                THEN PERFORM public.handler_notify_in_app(v_event);
        WHEN 'email'                 THEN PERFORM public.handler_enqueue_email(v_event);
        WHEN 'whatsapp'              THEN PERFORM public.handler_enqueue_whatsapp_suggestion(v_event);
        WHEN 'audit'                 THEN PERFORM public.handler_audit_write(v_event);
        WHEN 'ai_summary'            THEN PERFORM public.handler_ai_summary_refresh(v_event);
        WHEN 'notification_dispatch' THEN PERFORM public.handler_notification_dispatch(v_event);
        WHEN 'workflow_rules'        THEN PERFORM public.handler_workflow_rules(v_event);
        ELSE NULL;
      END CASE;

      UPDATE public.event_deliveries
      SET status='succeeded', attempts=attempts+1, last_error=NULL,
          started_at=v_started, completed_at=clock_timestamp(),
          processing_ms=extract(millisecond from (clock_timestamp()-v_started))::int,
          updated_at=now()
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.event_deliveries
      SET status=CASE WHEN r.attempts+1>=6 THEN 'dead' ELSE 'failed' END,
          attempts=attempts+1, last_error=SQLERRM,
          started_at=v_started, completed_at=clock_timestamp(),
          processing_ms=extract(millisecond from (clock_timestamp()-v_started))::int,
          next_retry_at=now()+(interval '30 seconds'*power(2,r.attempts)),
          updated_at=now()
      WHERE id = r.id;
    END;
    v_processed := v_processed+1;
  END LOOP;
  RETURN v_processed;
END; $function$;

-- Subscribe workflow_rules handler to every already-known event type
INSERT INTO public.event_subscriptions(event_type, handler_key)
SELECT DISTINCT event_type, 'workflow_rules'
FROM public.event_subscriptions
ON CONFLICT (event_type, handler_key) DO NOTHING;

-- 5. RPCs -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_workflow_progress(
  p_aggregate_type text,
  p_aggregate_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_stage text;
  v_org uuid;
  v_stages jsonb;
  v_idx int;
  v_total int;
  v_prev text; v_next text;
  v_blockers jsonb := '[]'::jsonb;
  v_missing  jsonb := '[]'::jsonb;
  v_has_invoice boolean := false;
  v_has_voucher boolean := false;
  v_paid numeric := 0;
  v_invoiced numeric := 0;
BEGIN
  IF p_aggregate_type <> 'booking' THEN
    RETURN jsonb_build_object('error','unsupported aggregate');
  END IF;

  SELECT workflow_stage::text, organization_id
    INTO v_stage, v_org
  FROM public.bookings WHERE id = p_aggregate_id;

  IF v_stage IS NULL THEN
    RETURN jsonb_build_object('error','not found');
  END IF;

  -- authorization
  IF NOT (v_org IS NULL OR public.is_platform_admin(auth.uid())
          OR EXISTS(SELECT 1 FROM public.organization_members m
                    WHERE m.organization_id=v_org AND m.user_id=auth.uid())) THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;

  SELECT jsonb_agg(jsonb_build_object('key',s.key,'label',s.label,'order',s.order_index) ORDER BY s.order_index),
         count(*)
    INTO v_stages, v_total
  FROM public.workflow_stages s
  JOIN public.workflow_definitions d ON d.id=s.definition_id
  WHERE d.key='booking_lifecycle' AND s.key <> 'cancelled';

  SELECT s.order_index INTO v_idx
  FROM public.workflow_stages s
  JOIN public.workflow_definitions d ON d.id=s.definition_id
  WHERE d.key='booking_lifecycle' AND s.key=v_stage;

  SELECT s.key INTO v_prev FROM public.workflow_stages s
    JOIN public.workflow_definitions d ON d.id=s.definition_id
    WHERE d.key='booking_lifecycle' AND s.order_index = v_idx-1;
  SELECT s.key INTO v_next FROM public.workflow_stages s
    JOIN public.workflow_definitions d ON d.id=s.definition_id
    WHERE d.key='booking_lifecycle' AND s.order_index = v_idx+1;

  SELECT EXISTS(SELECT 1 FROM public.invoices WHERE booking_id=p_aggregate_id) INTO v_has_invoice;
  SELECT EXISTS(SELECT 1 FROM public.booking_vouchers WHERE booking_id=p_aggregate_id) INTO v_has_voucher;
  SELECT coalesce(sum(amount),0) INTO v_paid FROM public.customer_payments WHERE booking_id=p_aggregate_id;
  SELECT coalesce(sum(total_amount),0) INTO v_invoiced FROM public.invoices WHERE booking_id=p_aggregate_id;

  IF v_stage IN ('quoted') AND NOT v_has_invoice THEN
    v_missing := v_missing || jsonb_build_array('invoice');
  END IF;
  IF v_stage IN ('confirmed') AND v_paid=0 THEN
    v_missing := v_missing || jsonb_build_array('customer_payment');
  END IF;
  IF v_stage='paid' AND NOT v_has_voucher THEN
    v_missing := v_missing || jsonb_build_array('voucher');
  END IF;
  IF v_invoiced>0 AND v_paid<v_invoiced AND v_stage NOT IN ('lead','qualified','quoted') THEN
    v_blockers := v_blockers || jsonb_build_array('outstanding_balance');
  END IF;

  RETURN jsonb_build_object(
    'current', v_stage,
    'previous', v_prev,
    'next', v_next,
    'progress_pct', CASE WHEN v_total>0 THEN round((coalesce(v_idx,0)::numeric / v_total::numeric)*100) ELSE 0 END,
    'total_stages', v_total,
    'stages', v_stages,
    'blockers', v_blockers,
    'missing', v_missing,
    'financial', jsonb_build_object('invoiced', v_invoiced, 'paid', v_paid, 'has_voucher', v_has_voucher)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_workflow_progress(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.advance_workflow(
  p_booking_id uuid,
  p_to_stage text,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_from text; v_org uuid;
BEGIN
  SELECT workflow_stage::text, organization_id INTO v_from, v_org
  FROM public.bookings WHERE id=p_booking_id;
  IF v_from IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.organization_members m
                WHERE m.organization_id=v_org AND m.user_id=auth.uid())
     AND NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.bookings SET workflow_stage=p_to_stage::booking_workflow_stage, updated_at=now()
  WHERE id=p_booking_id;

  PERFORM public.emit_event(
    'workflow.stage_changed', 'booking', p_booking_id, v_org,
    jsonb_build_object('from',v_from,'to',p_to_stage,'reason',p_reason,'actor',auth.uid()),
    'workflow_advance:'||p_booking_id||':'||v_from||'->'||p_to_stage||':'||extract(epoch from now())::bigint
  );

  RETURN jsonb_build_object('ok',true,'from',v_from,'to',p_to_stage);
END; $$;
GRANT EXECUTE ON FUNCTION public.advance_workflow(uuid, text, text) TO authenticated;

-- Ops Command Center summary
CREATE OR REPLACE FUNCTION public.get_ops_command_center(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_members
   WHERE user_id=auth.uid() LIMIT 1;
  IF v_org IS NULL AND NOT public.is_platform_admin(auth.uid()) THEN
    RETURN jsonb_build_object('error','no organization');
  END IF;

  RETURN jsonb_build_object(
    'arrivals_today', (SELECT count(*) FROM public.bookings
        WHERE (v_org IS NULL OR organization_id=v_org) AND start_date=p_date),
    'departures_today', (SELECT count(*) FROM public.bookings
        WHERE (v_org IS NULL OR organization_id=v_org) AND end_date=p_date),
    'checkins_next_7', (SELECT count(*) FROM public.bookings
        WHERE (v_org IS NULL OR organization_id=v_org)
          AND start_date BETWEEN p_date AND p_date+7),
    'pending_customer_payments', (SELECT coalesce(sum(i.total_amount - coalesce(i.paid_amount,0)),0)
        FROM public.invoices i
        WHERE (v_org IS NULL OR i.organization_id=v_org)
          AND coalesce(i.paid_amount,0) < i.total_amount),
    'pending_supplier_pos', (SELECT count(*) FROM public.supplier_payment_orders
        WHERE (v_org IS NULL OR organization_id=v_org) AND status IN ('pending','approved')),
    'overdue_tasks', (SELECT count(*) FROM public.booking_tasks
        WHERE (v_org IS NULL OR organization_id=v_org)
          AND status<>'completed' AND due_at < now()),
    'today_tasks', (SELECT count(*) FROM public.booking_tasks
        WHERE (v_org IS NULL OR organization_id=v_org)
          AND status<>'completed' AND due_at::date = p_date),
    'failed_events', (SELECT count(*) FROM public.event_deliveries d
        JOIN public.domain_events e ON e.id=d.event_id
        WHERE (v_org IS NULL OR e.organization_id=v_org)
          AND d.status IN ('failed','dead')),
    'whatsapp_failures_24h', (SELECT count(*) FROM public.whatsapp_messages
        WHERE (v_org IS NULL OR organization_id=v_org)
          AND status='failed' AND created_at > now()-interval '24 hours'),
    'refund_approvals', (SELECT count(*) FROM public.refund_requests
        WHERE (v_org IS NULL OR organization_id=v_org) AND status='pending'),
    'revenue_today', (SELECT coalesce(sum(amount),0) FROM public.customer_payments
        WHERE (v_org IS NULL OR organization_id=v_org) AND payment_date::date=p_date),
    'profit_today', (SELECT coalesce(sum(profit),0) FROM public.bookings
        WHERE (v_org IS NULL OR organization_id=v_org) AND updated_at::date=p_date
          AND workflow_stage IN ('paid','operations','traveling','completed','post_travel'))
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_ops_command_center(date) TO authenticated;

-- Business Health KPIs
CREATE OR REPLACE FUNCTION public.get_business_health_kpis(
  p_from date DEFAULT (CURRENT_DATE - INTERVAL '30 days')::date,
  p_to   date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_org uuid;
  v_leads int; v_won int;
  v_revenue numeric; v_profit numeric; v_cost numeric;
  v_recv numeric; v_pay numeric;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_members
    WHERE user_id=auth.uid() LIMIT 1;

  SELECT count(*), count(*) FILTER (WHERE workflow_stage IN ('paid','operations','traveling','completed','post_travel'))
    INTO v_leads, v_won
    FROM public.bookings
    WHERE (v_org IS NULL OR organization_id=v_org)
      AND created_at::date BETWEEN p_from AND p_to;

  SELECT coalesce(sum(selling_price),0), coalesce(sum(profit),0), coalesce(sum(cost_price),0)
    INTO v_revenue, v_profit, v_cost
    FROM public.bookings
    WHERE (v_org IS NULL OR organization_id=v_org)
      AND created_at::date BETWEEN p_from AND p_to
      AND workflow_stage IN ('paid','operations','traveling','completed','post_travel');

  SELECT coalesce(sum(total_amount - coalesce(paid_amount,0)),0) INTO v_recv
    FROM public.invoices
    WHERE (v_org IS NULL OR organization_id=v_org)
      AND coalesce(paid_amount,0) < total_amount;

  SELECT coalesce(sum(amount - coalesce(paid_amount,0)),0) INTO v_pay
    FROM public.supplier_payment_orders
    WHERE (v_org IS NULL OR organization_id=v_org)
      AND status IN ('pending','approved','partial');

  RETURN jsonb_build_object(
    'range', jsonb_build_object('from',p_from,'to',p_to),
    'leads', v_leads,
    'won', v_won,
    'conversion_pct', CASE WHEN v_leads>0 THEN round(v_won::numeric/v_leads*100,1) ELSE 0 END,
    'revenue', v_revenue,
    'cost', v_cost,
    'profit', v_profit,
    'margin_pct', CASE WHEN v_revenue>0 THEN round(v_profit/v_revenue*100,1) ELSE 0 END,
    'receivables', v_recv,
    'payables', v_pay,
    'top_consultant', (SELECT jsonb_build_object('id',e.id,'name',e.name,'revenue',coalesce(sum(b.selling_price),0))
                       FROM public.bookings b JOIN public.employees e ON e.id=b.employee_id
                       WHERE (v_org IS NULL OR b.organization_id=v_org)
                         AND b.created_at::date BETWEEN p_from AND p_to
                       GROUP BY e.id,e.name ORDER BY sum(b.selling_price) DESC NULLS LAST LIMIT 1)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_business_health_kpis(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.retry_workflow_rule_run(p_rule_id uuid, p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_event public.domain_events;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.workflow_rule_runs WHERE rule_id=p_rule_id AND event_id=p_event_id;
  SELECT * INTO v_event FROM public.domain_events WHERE id=p_event_id;
  IF v_event.id IS NOT NULL THEN
    PERFORM public.handler_workflow_rules(v_event);
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.retry_workflow_rule_run(uuid, uuid) TO authenticated;

-- 6. Seed one demo rule (log-only), platform-default -----------
INSERT INTO public.workflow_rules(name, description, event_type, action, priority)
VALUES (
  'Log booking.completed',
  'Records a log-only rule run whenever a booking completes (validates the rules engine end-to-end).',
  'booking.completed',
  '{"type":"log_only"}'::jsonb,
  100
) ON CONFLICT DO NOTHING;
