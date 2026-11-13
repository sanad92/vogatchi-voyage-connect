BEGIN;

CREATE TABLE public.platform_company_contact_history (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('call', 'whatsapp', 'email')),
  outcome text NOT NULL CHECK (outcome IN ('no_reply', 'reached', 'training_requested', 'renewal_promised', 'other')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000 AND (outcome <> 'other' OR btrim(note) <> '')),
  recorded_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_company_contact_history_org_time_idx
  ON public.platform_company_contact_history (organization_id, recorded_at DESC, id DESC);
CREATE INDEX platform_company_followups_due_idx
  ON public.platform_company_followups (next_followup_at, organization_id) WHERE next_followup_at IS NOT NULL;

ALTER TABLE public.platform_company_contact_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_company_contact_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_company_contact_history TO authenticated;
GRANT INSERT (id, organization_id, channel, outcome, note) ON public.platform_company_contact_history TO authenticated;

CREATE POLICY platform_company_contact_history_read ON public.platform_company_contact_history
  FOR SELECT TO authenticated USING (coalesce(public.is_platform_admin((SELECT auth.uid())), false));
CREATE POLICY platform_company_contact_history_append ON public.platform_company_contact_history
  FOR INSERT TO authenticated WITH CHECK (
    coalesce(public.is_platform_admin((SELECT auth.uid())), false) AND recorded_by = (SELECT auth.uid())
  );

CREATE FUNCTION public.platform_due_company_followups()
RETURNS TABLE (organization_id uuid, company_name text, next_followup_at date, overdue boolean,
  assigned_name text, note text, last_channel text, last_outcome text, last_recorded_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  cairo_today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
BEGIN
  IF NOT coalesce(public.is_platform_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT f.organization_id, o.name, f.next_followup_at, f.next_followup_at < cairo_today,
    coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.email), '')),
    f.note, h.channel, h.outcome, h.recorded_at
  FROM public.platform_company_followups f
  JOIN public.organizations o ON o.id = f.organization_id
  LEFT JOIN public.profiles p ON p.id = f.assigned_to AND coalesce(public.is_platform_admin(f.assigned_to), false)
  LEFT JOIN LATERAL (
    SELECT entry.channel, entry.outcome, entry.recorded_at
    FROM public.platform_company_contact_history entry
    WHERE entry.organization_id = f.organization_id
    ORDER BY entry.recorded_at DESC, entry.id DESC LIMIT 1
  ) h ON true
  WHERE f.next_followup_at <= cairo_today;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_due_company_followups() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_due_company_followups() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
