ALTER TABLE public.sop_org_policies
  ADD COLUMN IF NOT EXISTS auto_assign_enabled boolean NOT NULL DEFAULT true;

-- Round-robin assignment usable from triggers (no auth.uid() dependency).
CREATE OR REPLACE FUNCTION public.sop_auto_assign(_lead uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE l public.sop_leads; target uuid; sla int;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Skip when the org disabled auto assignment.
  IF NOT COALESCE((SELECT auto_assign_enabled FROM public.sop_org_policies WHERE organization_id = l.organization_id), true) THEN
    RETURN NULL;
  END IF;

  -- Skip when the lead already has a live assignment.
  IF EXISTS (SELECT 1 FROM public.sop_lead_assignments WHERE lead_id = _lead AND is_current) THEN
    RETURN NULL;
  END IF;

  -- Intake must be complete before ownership moves to sales.
  IF array_length(public.sop_intake_missing(l),1) IS NOT NULL THEN RETURN NULL; END IF;

  SELECT d.user_id INTO target FROM public.sop_department_members d
   WHERE d.organization_id = l.organization_id AND d.department = 'sales' AND d.is_available
   ORDER BY d.last_assigned_at NULLS FIRST, d.active_load ASC
   LIMIT 1;
  IF target IS NULL THEN RETURN NULL; END IF;

  sla := COALESCE((SELECT assignment_ack_sla_minutes FROM public.sop_org_policies WHERE organization_id = l.organization_id), 30);

  INSERT INTO public.sop_lead_assignments (organization_id, lead_id, assignee_id, assigned_by, method, ack_deadline_at)
  VALUES (l.organization_id, _lead, target, auth.uid(), 'round_robin', now() + make_interval(mins => sla));

  UPDATE public.sop_department_members
     SET last_assigned_at = now(), active_load = active_load + 1
   WHERE organization_id = l.organization_id AND user_id = target AND department = 'sales';

  UPDATE public.sop_leads SET current_owner_id = target WHERE id = _lead AND current_owner_id IS DISTINCT FROM target;

  PERFORM public.emit_event('sop.lead.assigned','sop_lead', _lead, l.organization_id,
    jsonb_build_object('assignee', target, 'method', 'auto_round_robin'),
    'sop.lead.autoassigned.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN target;
END $$;

REVOKE ALL ON FUNCTION public.sop_auto_assign(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.trg_sop_auto_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.stage = 'qualified' AND NEW.current_owner_id IS NULL THEN
    PERFORM public.sop_auto_assign(NEW.id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS sop_leads_auto_assign ON public.sop_leads;
CREATE TRIGGER sop_leads_auto_assign
AFTER INSERT OR UPDATE OF stage ON public.sop_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_sop_auto_assign();

-- Instant reflection in the intake UI.
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sop_lead_assignments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sop_department_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sop_leads; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;