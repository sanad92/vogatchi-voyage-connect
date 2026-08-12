
CREATE TABLE IF NOT EXISTS public.sop_lead_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_stage public.sop_lead_stage,
  to_stage public.sop_lead_stage,
  actor_user_id uuid,
  actor_name text,
  reason text,
  source text NOT NULL DEFAULT 'trigger',
  is_reconstructed boolean NOT NULL DEFAULT false,
  pricing_request_id uuid,
  quote_id uuid,
  booking_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  dedupe_key text NOT NULL UNIQUE
);

GRANT SELECT ON public.sop_lead_stage_history TO authenticated;
GRANT ALL ON public.sop_lead_stage_history TO service_role;

ALTER TABLE public.sop_lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read lead stage history"
  ON public.sop_lead_stage_history FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_slsh_lead ON public.sop_lead_stage_history(lead_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_slsh_org_time ON public.sop_lead_stage_history(organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_slsh_action ON public.sop_lead_stage_history(organization_id, action);

-- actor display name snapshot
CREATE OR REPLACE FUNCTION public.sop_actor_name(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT NULLIF(trim(coalesce(p.full_name, p.email, '')), '') FROM public.profiles p WHERE p.id = _user
$$;
REVOKE EXECUTE ON FUNCTION public.sop_actor_name(uuid) FROM anon, public;

CREATE OR REPLACE FUNCTION public.sop_history_write(
  _org uuid, _lead uuid, _action text, _from public.sop_lead_stage, _to public.sop_lead_stage,
  _actor uuid, _reason text, _source text, _reconstructed boolean,
  _pricing uuid, _quote uuid, _booking uuid, _meta jsonb, _at timestamptz, _key text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _lead IS NULL OR _org IS NULL THEN RETURN; END IF;
  INSERT INTO public.sop_lead_stage_history (
    organization_id, lead_id, action, from_stage, to_stage, actor_user_id, actor_name,
    reason, source, is_reconstructed, pricing_request_id, quote_id, booking_id, metadata, occurred_at, dedupe_key)
  VALUES (_org, _lead, _action, _from, _to, _actor, public.sop_actor_name(_actor),
    NULLIF(_reason,''), coalesce(_source,'trigger'), coalesce(_reconstructed,false),
    _pricing, _quote, _booking, coalesce(_meta,'{}'::jsonb), coalesce(_at, now()), _key)
  ON CONFLICT (dedupe_key) DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.sop_history_write(uuid,uuid,text,public.sop_lead_stage,public.sop_lead_stage,uuid,text,text,boolean,uuid,uuid,uuid,jsonb,timestamptz,text) FROM anon, public;

-- 1) lead lifecycle trigger
CREATE OR REPLACE FUNCTION public.sop_trg_lead_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sop_history_write(NEW.organization_id, NEW.id, 'lead_created', NULL, NEW.stage,
      coalesce(NEW.created_by, auth.uid()), NEW.lead_source, 'trigger', false, NULL, NEW.quote_id, NEW.booking_id,
      jsonb_build_object('lead_source', NEW.lead_source, 'is_legacy', NEW.is_legacy),
      coalesce(NEW.arrived_at, NEW.created_at, now()), 'created:' || NEW.id::text);
    RETURN NEW;
  END IF;

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    PERFORM public.sop_history_write(NEW.organization_id, NEW.id,
      CASE WHEN NEW.stage = 'accepted_pending_recheck' THEN 'customer_accepted'
           WHEN NEW.stage = 'won' THEN 'booking_confirmed'
           WHEN NEW.stage = 'lost' THEN 'lead_lost'
           ELSE 'stage_changed' END,
      OLD.stage, NEW.stage, auth.uid(), NEW.lost_reason, 'trigger', false, NULL, NEW.quote_id, NEW.booking_id,
      jsonb_build_object('owner_department', NEW.owner_department), now(),
      'stage:' || NEW.id::text || ':' || NEW.stage::text || ':' || extract(epoch from clock_timestamp())::bigint::text);
  END IF;

  IF NEW.intake_completed_at IS NOT NULL AND OLD.intake_completed_at IS NULL THEN
    PERFORM public.sop_history_write(NEW.organization_id, NEW.id, 'intake_completed', NULL, NEW.stage,
      auth.uid(), NULL, 'trigger', false, NULL, NULL, NULL, '{}'::jsonb, NEW.intake_completed_at,
      'intake:' || NEW.id::text);
  END IF;

  IF NEW.first_response_at IS NOT NULL AND OLD.first_response_at IS NULL THEN
    PERFORM public.sop_history_write(NEW.organization_id, NEW.id, 'cs_first_response', NULL, NEW.stage,
      auth.uid(), NULL, 'trigger', false, NULL, NULL, NULL, '{}'::jsonb, NEW.first_response_at,
      'firstresp:' || NEW.id::text);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sop_lead_history_ins ON public.sop_leads;
CREATE TRIGGER trg_sop_lead_history_ins AFTER INSERT ON public.sop_leads
  FOR EACH ROW EXECUTE FUNCTION public.sop_trg_lead_history();
DROP TRIGGER IF EXISTS trg_sop_lead_history_upd ON public.sop_leads;
CREATE TRIGGER trg_sop_lead_history_upd AFTER UPDATE ON public.sop_leads
  FOR EACH ROW EXECUTE FUNCTION public.sop_trg_lead_history();

-- 2) event-bus trigger for the non-stage SOP actions
CREATE OR REPLACE FUNCTION public.sop_trg_event_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_lead uuid; v_pr uuid; v_action text; v_actor uuid; v_stage public.sop_lead_stage; v_quote uuid;
BEGIN
  IF NEW.event_type NOT LIKE 'sop.%' OR NEW.event_type = 'sop.lead.stage_changed' THEN RETURN NEW; END IF;

  v_action := CASE NEW.event_type
    WHEN 'sop.lead.claimed' THEN 'sales_claimed'
    WHEN 'sop.lead.assigned' THEN 'sales_assigned'
    WHEN 'sop.lead.reassigned' THEN 'reassigned'
    WHEN 'sop.lead.assignment_acknowledged' THEN 'assignment_acknowledged'
    WHEN 'sop.lead.disqualified' THEN 'disqualified'
    WHEN 'sop.lead.reopened' THEN 'reopened'
    WHEN 'sop.lead.moved_back' THEN 'moved_back'
    WHEN 'sop.handover.updated' THEN 'handover_updated'
    WHEN 'sop.pricing_request.created' THEN 'pricing_requested'
    WHEN 'sop.pricing_request.claimed' THEN 'pricing_claimed'
    WHEN 'sop.pricing_request.published' THEN 'pricing_published'
    WHEN 'sop.pricing_request.returned' THEN 'pricing_returned'
    WHEN 'sop.recheck.requested' THEN 'recheck_requested'
    WHEN 'sop.recheck.completed' THEN 'recheck_completed'
    WHEN 'sop.booking.confirmed' THEN 'booking_confirmed'
    ELSE NULL END;
  IF v_action IS NULL THEN RETURN NEW; END IF;

  IF NEW.aggregate_type = 'sop_pricing_request' THEN
    v_pr := NEW.aggregate_id;
    v_lead := NULLIF(NEW.payload->>'lead_id','')::uuid;
    IF v_lead IS NULL THEN SELECT lead_id INTO v_lead FROM public.sop_pricing_requests WHERE id = v_pr; END IF;
  ELSE
    v_lead := NEW.aggregate_id;
    v_pr := NULLIF(NEW.payload->>'pricing_request_id','')::uuid;
  END IF;
  IF v_lead IS NULL THEN RETURN NEW; END IF;

  v_actor := coalesce(NEW.emitted_by,
    NULLIF(NEW.payload->>'by','')::uuid, NULLIF(NEW.payload->>'assignee','')::uuid,
    NULLIF(NEW.payload->>'to_user','')::uuid);
  v_quote := NULLIF(NEW.payload->>'quote_id','')::uuid;
  SELECT stage INTO v_stage FROM public.sop_leads WHERE id = v_lead;

  PERFORM public.sop_history_write(NEW.organization_id, v_lead, v_action,
    NULLIF(NEW.payload->>'from','')::public.sop_lead_stage, v_stage, v_actor,
    NEW.payload->>'reason', 'event', false, v_pr, v_quote, NULLIF(NEW.payload->>'booking_id','')::uuid,
    NEW.payload, NEW.occurred_at, 'evt:' || NEW.id::text);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sop_event_history ON public.domain_events;
CREATE TRIGGER trg_sop_event_history AFTER INSERT ON public.domain_events
  FOR EACH ROW EXECUTE FUNCTION public.sop_trg_event_history();
