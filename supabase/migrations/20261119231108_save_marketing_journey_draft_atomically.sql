CREATE OR REPLACE FUNCTION public.save_marketing_journey_draft(
  p_journey_id uuid, p_name text, p_description text, p_category text,
  p_trigger_event text, p_goal_event text, p_steps jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_step jsonb;
  v_step_id uuid;
  v_retained_ids uuid[] := '{}';
  v_position integer := 0;
BEGIN
  PERFORM 1 FROM public.marketing_journeys
  WHERE id = p_journey_id AND NOT is_template
    AND public.user_belongs_to_org(auth.uid(), organization_id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journey not available' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.journey_enrollments WHERE journey_id = p_journey_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Journey has active enrollments' USING ERRCODE = '55000';
  END IF;
  IF jsonb_typeof(p_steps) IS DISTINCT FROM 'array' OR nullif(btrim(p_name), '') IS NULL
    OR nullif(btrim(p_trigger_event), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid journey details' USING ERRCODE = '22023';
  END IF;

  FOR v_step IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
    v_step_id := (v_step->>'id')::uuid;
    IF jsonb_typeof(v_step->'config') IS DISTINCT FROM 'object'
      OR COALESCE((v_step->>'delay_minutes')::integer, 0) < 0 THEN
      RAISE EXCEPTION 'Invalid journey step' USING ERRCODE = '22023';
    END IF;
    IF v_step_id IS NULL THEN
      INSERT INTO public.journey_steps (journey_id, step_order, step_type, config, delay_minutes)
      VALUES (p_journey_id, v_position, v_step->>'step_type', v_step->'config',
        COALESCE((v_step->>'delay_minutes')::integer, 0))
      RETURNING id INTO v_step_id;
    ELSE
      IF v_step_id = ANY(v_retained_ids) THEN
        RAISE EXCEPTION 'Duplicate journey step' USING ERRCODE = '22023';
      END IF;
      UPDATE public.journey_steps
      SET step_order = v_position, step_type = v_step->>'step_type',
          config = v_step->'config', delay_minutes = COALESCE((v_step->>'delay_minutes')::integer, 0)
      WHERE id = v_step_id AND journey_id = p_journey_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Journey step not available' USING ERRCODE = '22023';
      END IF;
    END IF;
    v_retained_ids := array_append(v_retained_ids, v_step_id);
    v_position := v_position + 1;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.journey_steps
    WHERE journey_id = p_journey_id AND id = ANY(v_retained_ids) AND
      (branch_yes_step_id <> ALL(v_retained_ids) OR branch_no_step_id <> ALL(v_retained_ids))
  ) THEN
    RAISE EXCEPTION 'A retained branch references a removed step' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.journey_steps WHERE journey_id = p_journey_id AND id <> ALL(v_retained_ids);
  UPDATE public.marketing_journeys
  SET name = btrim(p_name), description = nullif(p_description, ''),
      category = COALESCE(nullif(p_category, ''), 'custom'),
      trigger_event = btrim(p_trigger_event), goal_event = nullif(p_goal_event, ''), updated_at = now()
  WHERE id = p_journey_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_marketing_journey_draft(uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_marketing_journey_draft(uuid, text, text, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.clone_marketing_journey_template(p_template_id uuid, p_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_journey_id uuid;
BEGIN
  IF NOT COALESCE(public.user_belongs_to_org(auth.uid(), p_org_id), false) THEN
    RAISE EXCEPTION 'Organization not available' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.marketing_journeys (organization_id, name, description, category,
    trigger_event, enrollment_condition, goal_event, created_by)
  SELECT p_org_id, name || ' (نسخة)', description, category, trigger_event,
    enrollment_condition, goal_event, auth.uid()
  FROM public.marketing_journeys WHERE id = p_template_id AND is_template
  RETURNING id INTO v_journey_id;
  IF v_journey_id IS NULL THEN
    RAISE EXCEPTION 'Journey template not available' USING ERRCODE = '42501';
  END IF;
  WITH steps AS MATERIALIZED (
    SELECT s.*, gen_random_uuid() AS new_id
    FROM public.journey_steps s WHERE s.journey_id = p_template_id
  )
  INSERT INTO public.journey_steps (id, journey_id, step_order, step_type, config,
    delay_minutes, branch_yes_step_id, branch_no_step_id)
  SELECT s.new_id, v_journey_id, s.step_order, s.step_type, s.config,
    s.delay_minutes, yes.new_id, no.new_id
  FROM steps s
  LEFT JOIN steps yes ON yes.id = s.branch_yes_step_id
  LEFT JOIN steps no ON no.id = s.branch_no_step_id;

  RETURN v_journey_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_marketing_journey_template(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_marketing_journey_template(uuid, uuid) TO authenticated;

DROP POLICY "journey_steps_org" ON public.journey_steps;
CREATE POLICY "journey_steps_read" ON public.journey_steps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketing_journeys j WHERE j.id = journey_id));
CREATE POLICY "journey_steps_write" ON public.journey_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketing_journeys j WHERE j.id = journey_id AND NOT j.is_template
                AND public.user_belongs_to_org(auth.uid(), j.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.marketing_journeys j WHERE j.id = journey_id AND NOT j.is_template
                      AND public.user_belongs_to_org(auth.uid(), j.organization_id)));
