CREATE OR REPLACE FUNCTION public.trg_emit_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_event('booking.created','booking',NEW.id, NEW.organization_id,
      to_jsonb(NEW), 'booking.created:'||NEW.id::text);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage THEN
      PERFORM public.emit_event('booking.stage_changed','booking',NEW.id, NEW.organization_id,
        jsonb_build_object('from',OLD.workflow_stage,'to',NEW.workflow_stage,'booking',to_jsonb(NEW)),
        'booking.stage_changed:'||NEW.id::text||':'||coalesce(NEW.workflow_stage::text,''));
    END IF;
    IF coalesce(NEW.status,'') = 'completed' AND coalesce(OLD.status,'') IS DISTINCT FROM 'completed' THEN
      PERFORM public.emit_event('booking.completed','booking',NEW.id, NEW.organization_id,
        to_jsonb(NEW), 'booking.completed:'||NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public._workflow_run_step(step jsonb, p_event domain_events, p_rule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t text := step ->> 'type';
  v_customer_id uuid;
  v_phone text;
  v_email text;
  v_name text;
  v_vars jsonb;
  v_body text;
  v_subject text;
  v_stage text;
BEGIN
  IF t IN ('emit','emit_event') THEN
    PERFORM public.emit_event(
      step ->> 'event', p_event.aggregate_type, p_event.aggregate_id,
      p_event.organization_id,
      coalesce(step -> 'payload', '{}'::jsonb) || jsonb_build_object('via_rule', p_rule_id),
      'rule:'||p_rule_id||':'||p_event.id||':'||md5(step::text)
    );

  ELSIF t = 'advance_stage' AND p_event.aggregate_type = 'booking' THEN
    v_stage := nullif(btrim(coalesce(step ->> 'to', step #>> '{params,to_stage}', '')), '');
    IF v_stage IS NOT NULL AND EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type ty ON ty.oid = e.enumtypid
      JOIN pg_namespace ns ON ns.oid = ty.typnamespace
      WHERE ns.nspname = 'public' AND ty.typname = 'booking_workflow_stage' AND e.enumlabel = v_stage
    ) THEN
      UPDATE public.bookings SET workflow_stage = v_stage::booking_workflow_stage
       WHERE id = p_event.aggregate_id;
    ELSE
      INSERT INTO public.booking_timeline_events(booking_id, organization_id, event_type, description, metadata)
      VALUES (p_event.aggregate_id, p_event.organization_id, 'advance_stage_skipped',
              'Invalid or empty target stage', step);
    END IF;

  ELSIF t = 'create_task' AND p_event.aggregate_type = 'booking' THEN
    INSERT INTO public.booking_tasks(booking_id, organization_id, title, description, status)
    VALUES (p_event.aggregate_id, p_event.organization_id,
      coalesce(step ->> 'title','مهمة تلقائية'), step ->> 'description', 'pending');

  ELSIF t = 'add_tag' AND p_event.aggregate_type = 'booking' THEN
    INSERT INTO public.booking_timeline_events(booking_id, organization_id, event_type, description, metadata)
    VALUES (p_event.aggregate_id, p_event.organization_id, 'tag_added',
            'Tag: '||coalesce(step ->> 'tag',''), jsonb_build_object('tag', step ->> 'tag'));

  ELSIF t IN ('send_whatsapp','send_email') THEN
    IF p_event.aggregate_type = 'booking' THEN
      SELECT b.customer_id INTO v_customer_id FROM public.bookings b WHERE b.id = p_event.aggregate_id;
    END IF;
    IF v_customer_id IS NULL THEN
      v_customer_id := nullif(coalesce(p_event.enriched_payload, p_event.payload) ->> 'customer_id','')::uuid;
    END IF;
    IF v_customer_id IS NOT NULL THEN
      SELECT phone, email, coalesce(name,'') INTO v_phone, v_email, v_name
        FROM public.customers WHERE id = v_customer_id;
    END IF;

    v_vars := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb)
              || jsonb_build_object('name', v_name, 'phone', v_phone, 'email', v_email);

    IF t = 'send_whatsapp' THEN
      v_body := public._render_template(step ->> 'message', v_vars);
      IF v_phone IS NOT NULL AND length(coalesce(v_body,''))>0 THEN
        INSERT INTO public.whatsapp_messages(organization_id, phone_number, direction, message_type, content, status, created_at)
        VALUES (p_event.organization_id, v_phone, 'outbound', 'text', v_body, 'queued', now());
      ELSE
        INSERT INTO public.booking_timeline_events(booking_id, organization_id, event_type, description, metadata)
        VALUES (CASE WHEN p_event.aggregate_type='booking' THEN p_event.aggregate_id ELSE NULL END,
                p_event.organization_id, 'send_whatsapp_skipped', 'No phone', step);
      END IF;

    ELSIF t = 'send_email' THEN
      v_subject := public._render_template(step ->> 'subject', v_vars);
      v_body    := public._render_template(step ->> 'body', v_vars);
      IF v_email IS NOT NULL AND length(coalesce(v_subject,''))>0 THEN
        INSERT INTO public.email_queue(organization_id, email_type, recipient_email, recipient_name, subject, template_data, status)
        VALUES (p_event.organization_id, coalesce(step ->> 'template','workflow'),
                v_email, v_name, v_subject,
                jsonb_build_object('body', v_body) || v_vars, 'pending');
      ELSE
        INSERT INTO public.booking_timeline_events(booking_id, organization_id, event_type, description, metadata)
        VALUES (CASE WHEN p_event.aggregate_type='booking' THEN p_event.aggregate_id ELSE NULL END,
                p_event.organization_id, 'send_email_skipped', 'No email', step);
      END IF;
    END IF;

  ELSIF t = 'log_only' THEN
    INSERT INTO public.booking_timeline_events(booking_id, organization_id, event_type, description, metadata)
    VALUES (CASE WHEN p_event.aggregate_type='booking' THEN p_event.aggregate_id ELSE NULL END,
            p_event.organization_id, 'log_only', coalesce(step ->> 'note',''), step);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handler_workflow_rules(p_event domain_events)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_started timestamptz;
  v_ms int;
  ctx jsonb;
  steps jsonb;
  i int;
  v_stage text;
BEGIN
  ctx := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb)
         || jsonb_build_object(
              'event_type', p_event.event_type,
              'aggregate_type', p_event.aggregate_type,
              'aggregate_id', p_event.aggregate_id,
              'organization_id', p_event.organization_id
            );

  FOR r IN
    SELECT * FROM public.workflow_rules
    WHERE event_type = p_event.event_type
      AND is_active = true
      AND (organization_id IS NULL OR organization_id = p_event.organization_id)
    ORDER BY priority ASC
  LOOP
    v_started := clock_timestamp();
    BEGIN
      IF NOT public._workflow_check_condition(coalesce(r.condition, '{}'::jsonb), ctx) THEN
        INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms)
        VALUES (r.id, p_event.id, p_event.organization_id, 'skipped',
                extract(millisecond from (clock_timestamp() - v_started))::int)
        ON CONFLICT (rule_id, event_id) DO NOTHING;
        CONTINUE;
      END IF;

      IF r.action ? 'steps' THEN
        steps := r.action -> 'steps';
        FOR i IN 0 .. jsonb_array_length(steps) - 1 LOOP
          PERFORM public._workflow_run_step(steps -> i, p_event, r.id);
        END LOOP;

      ELSIF r.action ->> 'type' = 'emit' THEN
        PERFORM public.emit_event(
          r.action ->> 'event', p_event.aggregate_type, p_event.aggregate_id,
          p_event.organization_id,
          coalesce(r.action -> 'payload','{}'::jsonb) || jsonb_build_object('via_rule', r.id),
          'rule:'||r.id||':'||p_event.id
        );
      ELSIF r.action ->> 'type' = 'advance_stage'
            AND p_event.aggregate_type = 'booking' THEN
        v_stage := nullif(btrim(coalesce(r.action ->> 'to', r.action #>> '{params,to_stage}', '')), '');
        IF v_stage IS NOT NULL AND EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type ty ON ty.oid = e.enumtypid
          JOIN pg_namespace ns ON ns.oid = ty.typnamespace
          WHERE ns.nspname = 'public' AND ty.typname = 'booking_workflow_stage' AND e.enumlabel = v_stage
        ) THEN
          UPDATE public.bookings
          SET workflow_stage = v_stage::booking_workflow_stage
          WHERE id = p_event.aggregate_id;
        ELSE
          INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms, error)
          VALUES (r.id, p_event.id, p_event.organization_id, 'skipped',
                  extract(millisecond from (clock_timestamp() - v_started))::int,
                  'invalid or empty target stage')
          ON CONFLICT (rule_id, event_id) DO NOTHING;
          CONTINUE;
        END IF;
      END IF;

      v_ms := extract(millisecond from (clock_timestamp() - v_started))::int;
      INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms)
      VALUES (r.id, p_event.id, p_event.organization_id, 'succeeded', v_ms)
      ON CONFLICT (rule_id, event_id) DO NOTHING;
      UPDATE public.workflow_rules
      SET last_run_at = now(), last_duration_ms = v_ms,
          success_count = success_count + 1, updated_at = now()
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      v_ms := extract(millisecond from (clock_timestamp() - v_started))::int;
      INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms, error)
      VALUES (r.id, p_event.id, p_event.organization_id, 'failed', v_ms, SQLERRM)
      ON CONFLICT (rule_id, event_id) DO UPDATE SET status='failed', error=EXCLUDED.error;
      UPDATE public.workflow_rules
      SET last_run_at = now(), last_duration_ms = v_ms,
          failure_count = failure_count + 1, updated_at = now()
      WHERE id = r.id;
    END;
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trg_emit_booking() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._workflow_run_step(jsonb, public.domain_events, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_workflow_rules(public.domain_events) FROM anon, public;