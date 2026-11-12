-- Safar ERP B2B preliminary passenger roster (NOT formal pilgrim registration).
-- Requires an internally approved B2B agreement and its allocated program
-- seats. Names never create financial debtor rows, visa/permit or supplier orders.
-- Staging/disposable only. PR #45 agreement schema precedes this migration.
BEGIN;

CREATE TABLE public.pilgrimage_b2b_roster_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 agreement_id uuid NOT NULL,
 client_key uuid NOT NULL,
 display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 3 AND 200),
 room_type text CHECK (room_type IN ('quad','triple','double','single')),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 removed_by uuid,
 removed_at timestamptz,
 UNIQUE (agreement_id,client_key),
 UNIQUE (organization_id,id),
 FOREIGN KEY (organization_id,agreement_id)
   REFERENCES public.pilgrimage_b2b_agreements(organization_id,id) ON DELETE RESTRICT,
 CHECK ((status='removed') = (removed_by IS NOT NULL AND removed_at IS NOT NULL))
);
CREATE INDEX pilgrimage_b2b_roster_active_idx
 ON public.pilgrimage_b2b_roster_entries(agreement_id,status,created_at);

CREATE TABLE public.pilgrimage_b2b_roster_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 entry_id uuid NOT NULL,
 action text NOT NULL CHECK (action IN ('added','removed')),
 actor_id uuid NOT NULL,
 event_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (organization_id,entry_id)
  REFERENCES public.pilgrimage_b2b_roster_entries(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX pilgrimage_b2b_roster_events_entry_idx
 ON public.pilgrimage_b2b_roster_events(entry_id,event_at DESC);

REVOKE ALL ON public.pilgrimage_b2b_roster_entries,
 public.pilgrimage_b2b_roster_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.pilgrimage_b2b_roster_entries,
 public.pilgrimage_b2b_roster_events TO authenticated;
GRANT ALL ON public.pilgrimage_b2b_roster_entries,
 public.pilgrimage_b2b_roster_events TO service_role;

ALTER TABLE public.pilgrimage_b2b_roster_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_b2b_roster_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read B2B preliminary group names"
 ON public.pilgrimage_b2b_roster_entries FOR SELECT TO authenticated
 USING (public.user_belongs_to_org(auth.uid(),organization_id)
  AND public.get_user_org_role(auth.uid(),organization_id)::text
   IN ('owner','admin','manager'));
CREATE POLICY "managers read B2B roster audit"
 ON public.pilgrimage_b2b_roster_events FOR SELECT TO authenticated
 USING (public.user_belongs_to_org(auth.uid(),organization_id)
  AND public.get_user_org_role(auth.uid(),organization_id)::text
   IN ('owner','admin','manager'));

CREATE OR REPLACE FUNCTION public.add_pilgrimage_b2b_roster_name(
 _agreement_id uuid, _client_key uuid, _display_name text, _room_type text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 actor uuid:=auth.uid();
 b public.pilgrimage_b2b_agreements%ROWTYPE;
 s public.pilgrimage_sales%ROWTYPE;
 old_entry public.pilgrimage_b2b_roster_entries%ROWTYPE;
 current_count bigint;
 entry_id uuid;
 normalized_name text:=btrim(coalesce(_display_name,''));
BEGIN
 IF actor IS NULL OR _agreement_id IS NULL OR _client_key IS NULL THEN
  RAISE EXCEPTION 'authenticated_manager_and_client_key_required'
   USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM public.pilgrimage_b2b_agreements
  WHERE id=_agreement_id AND public.user_belongs_to_org(actor,organization_id)
  FOR UPDATE;
 IF NOT FOUND OR public.get_user_org_role(actor,b.organization_id)::text
   NOT IN ('owner','admin','manager') THEN
  RAISE EXCEPTION 'roster_agreement_not_found_or_not_authorized'
   USING ERRCODE='42501'; END IF;
 IF b.status<>'approved_internal' OR
    char_length(normalized_name) NOT BETWEEN 3 AND 200 OR
    (_room_type IS NOT NULL AND _room_type NOT IN ('quad','triple','double','single')) THEN
  RAISE EXCEPTION 'approved_agreement_and_valid_name_required'
   USING ERRCODE='22023'; END IF;

 SELECT * INTO old_entry FROM public.pilgrimage_b2b_roster_entries
  WHERE agreement_id=b.id AND client_key=_client_key FOR UPDATE;
 IF FOUND THEN
  IF old_entry.status='active' AND old_entry.display_name=normalized_name
      AND old_entry.room_type IS NOT DISTINCT FROM _room_type THEN
    RETURN old_entry.id; END IF;
  RAISE EXCEPTION 'roster_client_key_already_used_with_other_details'
    USING ERRCODE='22023';
 END IF;
 SELECT * INTO s FROM public.pilgrimage_sales
   WHERE id=b.sale_id AND organization_id=b.organization_id;
 IF NOT FOUND OR s.status<>'quoted' OR s.sale_model<>'b2b_group' THEN
  RAISE EXCEPTION 'roster_quote_not_issued' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pilgrimage_seat_allocations a
   WHERE a.sale_id=s.id AND a.organization_id=s.organization_id
    AND a.status='allocated' AND a.seat_count=s.party_size) THEN
  RAISE EXCEPTION 'roster_requires_internal_allocation' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO current_count FROM public.pilgrimage_b2b_roster_entries x
  WHERE x.agreement_id=b.id AND x.status='active';
 IF current_count>=s.party_size THEN
  RAISE EXCEPTION 'b2b_roster_exceeds_contract_places' USING ERRCODE='22023'; END IF;
 INSERT INTO public.pilgrimage_b2b_roster_entries(
  organization_id,agreement_id,client_key,display_name,room_type,created_by
 ) VALUES (b.organization_id,b.id,_client_key,normalized_name,_room_type,actor)
 RETURNING id INTO entry_id;
 INSERT INTO public.pilgrimage_b2b_roster_events(
  organization_id,entry_id,action,actor_id
 ) VALUES (b.organization_id,entry_id,'added',actor);
 RETURN entry_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.remove_pilgrimage_b2b_roster_name(
 _entry_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 actor uuid:=auth.uid();
 entry public.pilgrimage_b2b_roster_entries%ROWTYPE;
 b public.pilgrimage_b2b_agreements%ROWTYPE;
BEGIN
 IF actor IS NULL OR _entry_id IS NULL THEN
  RAISE EXCEPTION 'authenticated_manager_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO entry FROM public.pilgrimage_b2b_roster_entries
  WHERE id=_entry_id AND public.user_belongs_to_org(actor,organization_id);
 IF NOT FOUND OR public.get_user_org_role(actor,entry.organization_id)::text
    NOT IN ('owner','admin','manager') THEN
  RAISE EXCEPTION 'roster_entry_not_found_or_not_authorized' USING ERRCODE='42501';
 END IF;
 -- Lock agreement first, just like add(), to serialize concurrent edits.
 SELECT * INTO b FROM public.pilgrimage_b2b_agreements
  WHERE id=entry.agreement_id AND organization_id=entry.organization_id FOR UPDATE;
 IF b.status<>'approved_internal' THEN
  RAISE EXCEPTION 'approved_b2b_roster_only' USING ERRCODE='22023'; END IF;
 SELECT * INTO entry FROM public.pilgrimage_b2b_roster_entries
  WHERE id=_entry_id AND organization_id=b.organization_id FOR UPDATE;
 IF entry.status='removed' THEN RETURN entry.id; END IF;
 UPDATE public.pilgrimage_b2b_roster_entries
  SET status='removed',removed_by=actor,removed_at=clock_timestamp()
  WHERE id=entry.id;
 INSERT INTO public.pilgrimage_b2b_roster_events(
  organization_id,entry_id,action,actor_id
 ) VALUES (b.organization_id,entry.id,'removed',actor);
 RETURN entry.id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.add_pilgrimage_b2b_roster_name(uuid,uuid,text,text)
 FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.remove_pilgrimage_b2b_roster_name(uuid)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_pilgrimage_b2b_roster_name(uuid,uuid,text,text)
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_pilgrimage_b2b_roster_name(uuid)
 TO authenticated;
COMMIT;
