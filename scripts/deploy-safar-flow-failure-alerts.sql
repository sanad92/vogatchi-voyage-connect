-- Safar Flow V4 — Internal failure/overdue alerts.
-- STAGED ONLY. Requires V2 private job queue and V3 monitor.
-- No external messages, payments, booking changes or job retries here.
BEGIN;

CREATE TABLE IF NOT EXISTS safar_flow.job_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES safar_flow.jobs(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  notification_id uuid NOT NULL UNIQUE,
  alert_kind text NOT NULL CHECK (alert_kind IN ('dead', 'overdue')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safar_flow_job_alert_once UNIQUE(job_id, alert_kind)
);
CREATE INDEX IF NOT EXISTS idx_safar_flow_job_alerts_org_time
  ON safar_flow.job_alerts (organization_id, created_at DESC);

REVOKE ALL ON safar_flow.job_alerts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON safar_flow.job_alerts TO service_role;
ALTER TABLE safar_flow.job_alerts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION safar_flow.dispatch_failure_alerts(
  p_limit integer DEFAULT 50,
  p_overdue_minutes integer DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
  j safar_flow.jobs%ROWTYPE;
  v_kind text;
  v_recipient uuid;
  v_alert_id uuid;
  v_notification_id uuid;
  v_created integer := 0;
  v_unrouted integer := 0;
  v_failed integer := 0;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_overdue_minutes IS NULL OR p_overdue_minutes NOT BETWEEN 15 AND 1440
  THEN
    RAISE EXCEPTION 'Invalid Safar Flow alert parameters' USING ERRCODE='22023';
  END IF;

  FOR j IN
    SELECT jobs.*
    FROM safar_flow.jobs
    WHERE (
      jobs.status = 'dead'
      OR (jobs.status IN ('scheduled','retrying')
          AND jobs.available_at < now() - make_interval(mins => p_overdue_minutes))
    )
    AND NOT EXISTS (
      SELECT 1 FROM safar_flow.job_alerts a
      WHERE a.job_id = jobs.id
        AND a.alert_kind =
          CASE WHEN jobs.status = 'dead' THEN 'dead' ELSE 'overdue' END
    )
    ORDER BY (jobs.status = 'dead') DESC, jobs.available_at, jobs.id
    LIMIT p_limit
    FOR UPDATE OF jobs SKIP LOCKED
  LOOP
    v_kind := CASE WHEN j.status = 'dead' THEN 'dead' ELSE 'overdue' END;
    v_recipient := NULL;
    v_alert_id := NULL;
    v_notification_id := gen_random_uuid();

    -- Deterministically choose an active owner/admin in the SAME organization.
    -- Do not notify inactive staff or users outside the tenant.
    SELECT m.user_id INTO v_recipient
    FROM public.organization_members m
    WHERE m.organization_id = j.organization_id
      AND m.is_active IS TRUE
      AND m.role::text IN ('owner', 'admin')
    ORDER BY CASE WHEN m.role::text = 'owner' THEN 0 ELSE 1 END, m.user_id
    LIMIT 1;

    IF v_recipient IS NULL THEN
      -- Not marked as alerted: if the company assigns an owner/admin later,
      -- the next run can route the alert.
      v_unrouted := v_unrouted + 1;
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO safar_flow.job_alerts(
        job_id, organization_id, recipient_id, notification_id, alert_kind
      ) VALUES (
        j.id, j.organization_id, v_recipient, v_notification_id, v_kind
      )
      ON CONFLICT ON CONSTRAINT safar_flow_job_alert_once DO NOTHING
      RETURNING id INTO v_alert_id;

      IF v_alert_id IS NOT NULL THEN
        INSERT INTO public.notifications(
          id, user_id, organization_id, title, message,
          type, priority, action_url, metadata
        ) VALUES (
          v_notification_id, v_recipient, j.organization_id,
          CASE WHEN v_kind = 'dead'
            THEN 'فشل تنفيذ مهمة أتمتة'
            ELSE 'تأخرت مهمة أتمتة عن موعدها' END,
          CASE WHEN v_kind = 'dead'
            THEN 'فشلت مهمة Safar Flow بعد المحاولات المحددة. راجع ملف الحجز مع مسؤول التشغيل.'
            ELSE 'مهمة Safar Flow لم تُنفذ في موعدها. راجع حالة التنفيذ والجدولة.' END,
          'warning',
          CASE WHEN v_kind = 'dead' THEN 'urgent' ELSE 'high' END,
          '/bookings/' || j.booking_id::text || '/workspace',
          jsonb_build_object(
            'source', 'safar_flow',
            'job_id', j.id,
            'alert_kind', v_kind
          )
        );
        -- Atomic: this notification and the unique alert marker commit together.
        v_created := v_created + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- The failed INSERT and alert marker roll back together in this
      -- subtransaction. A later run may try again.
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'unrouted', v_unrouted,
    'failed', v_failed
  );
END;
$$;

REVOKE ALL ON FUNCTION safar_flow.dispatch_failure_alerts(integer, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION safar_flow.dispatch_failure_alerts(integer, integer)
TO service_role;

-- Browser-facing read-only alert audit. It does not expose raw job errors,
-- contact details, payloads or arbitrary tenant IDs.
CREATE OR REPLACE FUNCTION public.get_safar_flow_alert_health(
  p_organization_id uuid,
  p_limit integer DEFAULT 10
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
  v_count jsonb;
  v_recent jsonb;
BEGIN
  IF p_organization_id IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 25 THEN
    RAISE EXCEPTION 'Invalid Safar Flow alert view parameters' USING ERRCODE='22023';
  END IF;

  IF auth.uid() IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = p_organization_id
        AND m.user_id = auth.uid()
        AND m.is_active IS TRUE
    )
    OR NOT COALESCE(public.has_org_permission(p_organization_id,'automation_view'),FALSE)
  THEN
    RAISE EXCEPTION 'Not authorized to view Safar Flow alerts'
      USING ERRCODE='42501';
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'dead', count(*) FILTER (WHERE a.alert_kind = 'dead'),
    'overdue', count(*) FILTER (WHERE a.alert_kind = 'overdue')
  ) INTO v_count
  FROM safar_flow.job_alerts a
  WHERE a.organization_id = p_organization_id;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'id', r.id,
      'booking_id', r.booking_id,
      'template_key', r.template_key,
      'alert_kind', r.alert_kind,
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC, r.id DESC),
    '[]'::jsonb
  ) INTO v_recent
  FROM (
    SELECT a.id, j.booking_id, j.template_key, a.alert_kind, a.created_at
    FROM safar_flow.job_alerts a
    JOIN safar_flow.jobs j ON j.id = a.job_id
      AND j.organization_id = a.organization_id
    WHERE a.organization_id = p_organization_id
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT p_limit
  ) r;

  RETURN jsonb_build_object(
    'counts', v_count,
    'alerts', v_recent,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_safar_flow_alert_health(uuid, integer)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_safar_flow_alert_health(uuid, integer)
TO authenticated;

COMMIT;
