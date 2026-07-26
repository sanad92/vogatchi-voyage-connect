
CREATE OR REPLACE FUNCTION public._workflow_run_step(step jsonb, p_event public.domain_events, p_rule_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t text := step ->> 'type';
  v_customer_id uuid;
  v_phone text;
  v_email text;
  v_name text;
  v_vars jsonb;
  v_body text;
  v_subject text;
BEGIN
  IF t IN ('emit','emit_event') THEN
    PERFORM public.emit_event(
      step ->> 'event', p_event.aggregate_type, p_event.aggregate_id,
      p_event.organization_id,
      coalesce(step -> 'payload', '{}'::jsonb) || jsonb_build_object('via_rule', p_rule_id),
      'rule:'||p_rule_id||':'||p_event.id||':'||md5(step::text)
    );

  ELSIF t = 'advance_stage' AND p_event.aggregate_type = 'booking' THEN
    UPDATE public.bookings SET workflow_stage = (step ->> 'to')::booking_workflow_stage
     WHERE id = p_event.aggregate_id;

  ELSIF t = 'create_task' AND p_event.aggregate_type = 'booking' THEN
    INSERT INTO public.booking_tasks(booking_id, organization_id, title, description, status)
    VALUES (p_event.aggregate_id, p_event.organization_id,
      coalesce(step ->> 'title','مهمة تلقائية'), step ->> 'description', 'pending');

  ELSIF t = 'add_tag' AND p_event.aggregate_type = 'booking' THEN
    INSERT INTO public.booking_timeline_events(booking_id, organization_id, event_type, description, metadata)
    VALUES (p_event.aggregate_id, p_event.organization_id, 'tag_added',
            'Tag: '||coalesce(step ->> 'tag',''), jsonb_build_object('tag', step ->> 'tag'));

  ELSIF t IN ('send_whatsapp','send_email') THEN
    -- Resolve recipient from booking → customer, or payload
    IF p_event.aggregate_type = 'booking' THEN
      SELECT b.customer_id INTO v_customer_id FROM public.bookings b WHERE b.id = p_event.aggregate_id;
    END IF;
    IF v_customer_id IS NULL THEN
      v_customer_id := (coalesce(p_event.enriched_payload, p_event.payload) ->> 'customer_id')::uuid;
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
END;$$;
