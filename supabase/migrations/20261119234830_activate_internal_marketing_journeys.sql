-- Only newly activated journeys and newly enrolled customers enter this worker.
ALTER TABLE public.marketing_journeys ADD COLUMN runtime_enabled_at timestamptz;
ALTER TABLE public.journey_enrollments
  ADD COLUMN runtime_managed boolean NOT NULL DEFAULT false,
  ADD COLUMN step_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.journey_steps DROP CONSTRAINT journey_steps_step_type_check;
ALTER TABLE public.journey_steps ADD CONSTRAINT journey_steps_step_type_check
  CHECK (step_type IN ('send_whatsapp', 'send_email', 'wait', 'condition', 'tag', 'emit_event', 'exit', 'create_follow_up'));

CREATE INDEX marketing_journeys_runtime_org_idx ON public.marketing_journeys (organization_id, id)
  WHERE is_active AND runtime_enabled_at IS NOT NULL;
CREATE INDEX journey_runtime_due_idx ON public.journey_enrollments (next_run_at, id)
  WHERE status = 'active' AND runtime_managed;

REVOKE INSERT, UPDATE ON public.marketing_journeys FROM PUBLIC, anon, authenticated;
GRANT INSERT (organization_id, name, description, category, trigger_event, enrollment_condition, goal_event, created_by)
  ON public.marketing_journeys TO authenticated;
GRANT UPDATE (name, description, category, trigger_event, enrollment_condition, goal_event, updated_at)
  ON public.marketing_journeys TO authenticated;

DROP POLICY journeys_org_read ON public.marketing_journeys;
DROP POLICY journeys_org_write ON public.marketing_journeys;
CREATE POLICY journeys_org_read ON public.marketing_journeys FOR SELECT TO authenticated
  USING ((is_template AND organization_id IS NULL) OR
    (public.user_belongs_to_org((SELECT auth.uid()), organization_id)
      AND public.has_org_permission(organization_id, 'marketing_view')));
CREATE POLICY journeys_org_manage ON public.marketing_journeys FOR ALL TO authenticated
  USING (NOT is_template AND public.user_belongs_to_org((SELECT auth.uid()), organization_id)
    AND public.has_org_permission(organization_id, 'marketing_edit') AND public.can_org_write(organization_id)
    AND (runtime_enabled_at IS NULL OR NOT is_active))
  WITH CHECK (NOT is_template AND public.user_belongs_to_org((SELECT auth.uid()), organization_id)
    AND public.has_org_permission(organization_id, 'marketing_edit') AND public.can_org_write(organization_id)
    AND (runtime_enabled_at IS NULL OR NOT is_active));

DROP POLICY journey_steps_write ON public.journey_steps;
CREATE POLICY journey_steps_write ON public.journey_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketing_journeys j WHERE j.id = journey_id
    AND NOT j.is_template AND public.user_belongs_to_org((SELECT auth.uid()), j.organization_id)
    AND public.has_org_permission(j.organization_id, 'marketing_edit') AND public.can_org_write(j.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.marketing_journeys j WHERE j.id = journey_id
    AND NOT j.is_template AND public.user_belongs_to_org((SELECT auth.uid()), j.organization_id)
    AND public.has_org_permission(j.organization_id, 'marketing_edit') AND public.can_org_write(j.organization_id)));

REVOKE INSERT, UPDATE, DELETE ON public.journey_enrollments FROM PUBLIC, anon, authenticated;
DROP POLICY journey_enr_org ON public.journey_enrollments;
CREATE POLICY journey_enr_read ON public.journey_enrollments FOR SELECT TO authenticated
  USING (public.user_belongs_to_org((SELECT auth.uid()), organization_id)
    AND public.has_org_permission(organization_id, 'marketing_view'));

REVOKE INSERT, UPDATE, DELETE ON public.journey_step_runs FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS journey_runs_write ON public.journey_step_runs;
REVOKE ALL ON FUNCTION public.enroll_in_journey(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION operations_private.guard_journey_runtime_steps()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_journey uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.journey_id ELSE NEW.journey_id END;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.journey_id IS DISTINCT FROM NEW.journey_id THEN
    RAISE EXCEPTION 'journey_step_identity_immutable' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.marketing_journeys WHERE id = v_journey FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.marketing_journeys WHERE id = v_journey AND is_active AND runtime_enabled_at IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.journey_enrollments WHERE journey_id = v_journey AND status = 'active' AND runtime_managed)
  THEN
    RAISE EXCEPTION 'journey_has_running_steps' USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.guard_journey_runtime_steps() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_journey_runtime_steps BEFORE INSERT OR UPDATE OR DELETE ON public.journey_steps
FOR EACH ROW EXECUTE FUNCTION operations_private.guard_journey_runtime_steps();

CREATE FUNCTION operations_private.set_marketing_journey_active(_journey uuid, _organization uuid, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_journey public.marketing_journeys%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
    OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _organization), false)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(_organization, auth.uid(), 'marketing_edit') p
      WHERE p.granted AND p.data_scope = 'organization'
    )
    OR (_enabled AND NOT coalesce(public.can_org_write(_organization), false))
  THEN
    RAISE EXCEPTION 'journey_activation_access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_journey FROM public.marketing_journeys
  WHERE id = _journey AND organization_id = _organization AND NOT is_template
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journey_activation_access_denied' USING ERRCODE = '42501';
  END IF;
  IF _enabled IS NULL THEN
    RAISE EXCEPTION 'journey_activation_invalid_state' USING ERRCODE = '22023';
  END IF;

  IF _enabled THEN
    IF v_journey.trigger_event <> 'customer.created' OR v_journey.goal_event IS NOT NULL
      OR v_journey.enrollment_condition <> '{}'::jsonb
      OR (SELECT count(*) FROM public.journey_steps WHERE journey_id = _journey) > 30
      OR NOT EXISTS (SELECT 1 FROM public.journey_steps WHERE journey_id = _journey AND step_type = 'create_follow_up')
      OR EXISTS (
        SELECT 1 FROM public.journey_steps s
        WHERE s.journey_id = _journey AND (
          s.step_type NOT IN ('wait', 'create_follow_up', 'exit')
          OR s.delay_minutes NOT BETWEEN 0 AND 43200
          OR s.branch_yes_step_id IS NOT NULL OR s.branch_no_step_id IS NOT NULL
          OR (s.step_type <> 'create_follow_up' AND s.config <> '{}'::jsonb)
          OR (s.step_type = 'create_follow_up' AND (
            jsonb_typeof(s.config) <> 'object' OR s.config - 'notes' <> '{}'::jsonb
            OR (s.config ? 'notes' AND jsonb_typeof(s.config->'notes') <> 'string')
            OR length(s.config->>'notes') > 500
          ))
          OR (s.step_type = 'exit' AND EXISTS (
            SELECT 1 FROM public.journey_steps following
            WHERE following.journey_id = _journey AND following.step_order > s.step_order
          ))
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.journey_steps WHERE journey_id = _journey
        GROUP BY step_order HAVING count(*) > 1
      )
    THEN
      RAISE EXCEPTION 'journey_activation_unsupported' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.marketing_journeys SET is_active = _enabled,
    runtime_enabled_at = CASE WHEN _enabled THEN coalesce(runtime_enabled_at, now()) ELSE runtime_enabled_at END,
    stats = CASE WHEN _enabled AND runtime_enabled_at IS NULL
      THEN (CASE WHEN jsonb_typeof(stats) = 'object' THEN stats ELSE '{}'::jsonb END) ||
        '{"enrolled":0,"completed":0}'::jsonb ELSE stats END,
    updated_at = now()
  WHERE id = _journey;
END;
$$;

CREATE FUNCTION public.set_marketing_journey_active(_journey uuid, _organization uuid, _enabled boolean)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT operations_private.set_marketing_journey_active(_journey, _organization, _enabled); $$;

REVOKE ALL ON FUNCTION operations_private.set_marketing_journey_active(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_marketing_journey_active(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION operations_private.set_marketing_journey_active(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_marketing_journey_active(uuid, uuid, boolean) TO authenticated;

CREATE FUNCTION operations_private.enroll_new_customer_in_marketing_journeys()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_journey uuid;
  v_step record;
BEGIN
  IF NEW.organization_id IS NULL OR NEW.is_demo IS TRUE OR NEW.archived_at IS NOT NULL THEN RETURN NEW; END IF;

  FOR v_journey IN
    SELECT id FROM public.marketing_journeys
    WHERE organization_id = NEW.organization_id AND is_active AND runtime_enabled_at IS NOT NULL
      AND NOT is_template AND trigger_event = 'customer.created'
      AND public.org_has_active_subscription(NEW.organization_id)
    ORDER BY id FOR UPDATE
  LOOP
    SELECT id, delay_minutes INTO v_step FROM public.journey_steps
    WHERE journey_id = v_journey ORDER BY step_order LIMIT 1;
    INSERT INTO public.journey_enrollments
      (journey_id, organization_id, customer_id, current_step_id, runtime_managed, next_run_at)
    VALUES (v_journey, NEW.organization_id, NEW.id, v_step.id, true,
      now() + make_interval(mins => v_step.delay_minutes))
    ON CONFLICT (journey_id, customer_id) DO NOTHING;
    IF FOUND THEN
      UPDATE public.marketing_journeys
      SET stats = jsonb_set(stats, '{enrolled}', to_jsonb((stats->>'enrolled')::bigint + 1))
      WHERE id = v_journey;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.enroll_new_customer_in_marketing_journeys() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enroll_new_customer_in_marketing_journeys AFTER INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION operations_private.enroll_new_customer_in_marketing_journeys();

CREATE OR REPLACE FUNCTION public.process_journey_enrollments(p_limit int DEFAULT 100)
RETURNS int LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_enrollment record;
  v_step public.journey_steps%ROWTYPE;
  v_next record;
  v_follow_up uuid;
  v_processed integer := 0;
BEGIN
  FOR v_enrollment IN
    SELECT e.* FROM public.journey_enrollments e
    JOIN public.marketing_journeys j ON j.id = e.journey_id AND j.organization_id = e.organization_id
    WHERE e.status = 'active' AND e.runtime_managed AND e.next_run_at <= now()
      AND j.is_active AND j.runtime_enabled_at IS NOT NULL
      AND public.org_has_active_subscription(e.organization_id)
    ORDER BY e.next_run_at, e.id
    LIMIT least(greatest(coalesce(p_limit, 50), 1), 100)
    FOR UPDATE OF e, j SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;
    PERFORM 1 FROM public.customers WHERE id = v_enrollment.customer_id
      AND organization_id = v_enrollment.organization_id AND is_demo IS NOT TRUE AND archived_at IS NULL
    FOR SHARE;
    IF NOT FOUND THEN
      UPDATE public.journey_enrollments SET status = 'exited', exit_reason = 'customer_unavailable', updated_at = now()
      WHERE id = v_enrollment.id;
      CONTINUE;
    END IF;

    SELECT * INTO v_step FROM public.journey_steps
    WHERE id = v_enrollment.current_step_id AND journey_id = v_enrollment.journey_id;
    IF NOT FOUND OR v_step.step_type NOT IN ('wait', 'create_follow_up', 'exit') THEN
      UPDATE public.journey_enrollments SET status = 'failed', exit_reason = 'unsupported_step', updated_at = now()
      WHERE id = v_enrollment.id;
      CONTINUE;
    END IF;

    -- The action, its log, and advancement commit together for this enrollment.
    BEGIN
      v_follow_up := NULL;
      IF v_step.step_type = 'create_follow_up' THEN
        INSERT INTO public.customer_follow_ups
          (organization_id, customer_id, follow_up_type, scheduled_date, status, priority, notes)
        VALUES (v_enrollment.organization_id, v_enrollment.customer_id, 'manual_contact',
          (now() AT TIME ZONE 'Africa/Cairo')::date, 'pending', 'normal',
          coalesce(nullif(btrim(v_step.config->>'notes'), ''), 'متابعة عميل من رحلة تسويق'))
        RETURNING id INTO v_follow_up;
      END IF;

      INSERT INTO public.journey_step_runs (enrollment_id, step_id, status, output)
      VALUES (v_enrollment.id, v_step.id, 'succeeded',
        CASE WHEN v_follow_up IS NULL THEN NULL ELSE jsonb_build_object('follow_up_id', v_follow_up) END);

      SELECT id, delay_minutes INTO v_next FROM public.journey_steps
      WHERE journey_id = v_enrollment.journey_id AND step_order > v_step.step_order
        AND v_step.step_type <> 'exit'
      ORDER BY step_order LIMIT 1;

      IF v_next.id IS NULL THEN
        UPDATE public.journey_enrollments SET status = 'completed', current_step_id = NULL,
          step_attempts = 0, exit_reason = NULL, updated_at = now()
        WHERE id = v_enrollment.id;
        UPDATE public.marketing_journeys
        SET stats = jsonb_set(stats, '{completed}', to_jsonb((stats->>'completed')::bigint + 1))
        WHERE id = v_enrollment.journey_id;
      ELSE
        UPDATE public.journey_enrollments
        SET current_step_id = v_next.id, next_run_at = now() + make_interval(mins => v_next.delay_minutes),
          step_attempts = 0, exit_reason = NULL, updated_at = now()
        WHERE id = v_enrollment.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.journey_step_runs (enrollment_id, step_id, status, error)
      VALUES (v_enrollment.id, v_step.id, 'failed', SQLSTATE);
      UPDATE public.journey_enrollments
      SET step_attempts = v_enrollment.step_attempts + 1,
        status = CASE WHEN v_enrollment.step_attempts >= 2 THEN 'failed' ELSE 'active' END,
        exit_reason = CASE WHEN v_enrollment.step_attempts >= 2 THEN 'retry_limit_reached' ELSE NULL END,
        next_run_at = now() + make_interval(mins => CASE WHEN v_enrollment.step_attempts = 0 THEN 5 ELSE 15 END),
        updated_at = now()
      WHERE id = v_enrollment.id;
    END;
  END LOOP;
  RETURN v_processed;
END;
$$;

REVOKE ALL ON FUNCTION public.process_journey_enrollments(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_journey_enrollments(int) TO service_role;

CREATE FUNCTION public.get_marketing_journey_runtime_counts(_journey uuid, _organization uuid)
RETURNS TABLE (total bigint, active bigint, completed bigint, exited bigint, failed bigint, retrying bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT count(e.id),
    count(e.id) FILTER (WHERE e.status = 'active'),
    count(e.id) FILTER (WHERE e.status = 'completed'),
    count(e.id) FILTER (WHERE e.status = 'exited'),
    count(e.id) FILTER (WHERE e.status = 'failed'),
    count(e.id) FILTER (WHERE e.status = 'active' AND e.step_attempts > 0)
  FROM public.marketing_journeys j
  LEFT JOIN public.journey_enrollments e ON e.journey_id = j.id AND e.organization_id = j.organization_id
    AND e.runtime_managed
  WHERE j.id = _journey AND j.organization_id = _organization
  GROUP BY j.id;
$$;
REVOKE ALL ON FUNCTION public.get_marketing_journey_runtime_counts(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketing_journey_runtime_counts(uuid, uuid) TO authenticated;

-- Local fixtures invoke the same processor without enabling a scheduler.
SELECT cron.schedule('dispatch-marketing-journey-steps', '* * * * *',
  $job$SELECT public.process_journey_enrollments(50);$job$);
