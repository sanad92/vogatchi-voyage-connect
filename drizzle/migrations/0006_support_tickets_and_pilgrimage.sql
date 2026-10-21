
-- ===== Platform support tickets =====
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_number bigint GENERATED ALWAYS AS IDENTITY,
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','technical','billing','accounting','whatsapp','data','feature_request')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  assigned_to uuid,
  sla_due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.support_tickets(organization_id, status);

CREATE POLICY "Members view own org tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Members open tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND created_by = auth.uid());
CREATE POLICY "Platform admins manage tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public._support_ticket_defaults()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'open';
    NEW.assigned_to := NULL;
    NEW.first_response_at := NULL;
    NEW.resolved_at := NULL;
    NEW.sla_due_at := now() + CASE NEW.priority
      WHEN 'urgent' THEN interval '4 hours'
      WHEN 'high' THEN interval '8 hours'
      WHEN 'normal' THEN interval '24 hours'
      ELSE interval '72 hours' END;
  ELSE
    IF NEW.status IN ('resolved','closed') AND OLD.status NOT IN ('resolved','closed') THEN
      NEW.resolved_at := now();
    ELSIF NEW.status NOT IN ('resolved','closed') THEN
      NEW.resolved_at := NULL;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_support_ticket_defaults BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public._support_ticket_defaults();

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (length(trim(body)) > 0),
  is_staff boolean NOT NULL DEFAULT false,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.support_ticket_messages(ticket_id, created_at);

CREATE POLICY "View ticket messages" ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid())
    OR (NOT is_internal AND public.user_belongs_to_org(auth.uid(), organization_id)));
CREATE POLICY "Reply to ticket" ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND (
    public.is_platform_admin(auth.uid())
    OR (public.user_belongs_to_org(auth.uid(), organization_id) AND NOT is_staff AND NOT is_internal)));

CREATE OR REPLACE FUNCTION public._support_message_effects()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.support_tickets;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF t.id IS NULL OR t.organization_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'ticket organization mismatch';
  END IF;
  NEW.is_staff := public.is_platform_admin(NEW.author_id) AND NEW.is_staff;
  IF NEW.is_staff AND NOT NEW.is_internal THEN
    UPDATE public.support_tickets SET
      first_response_at = COALESCE(first_response_at, now()),
      status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
    WHERE id = t.id;
  ELSIF NOT NEW.is_staff AND t.status IN ('waiting_customer','resolved') THEN
    UPDATE public.support_tickets SET status = 'in_progress' WHERE id = t.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_support_message_effects BEFORE INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public._support_message_effects();

-- ===== Hajj & Umrah =====
CREATE TABLE public.pilgrimage_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_type text NOT NULL CHECK (program_type IN ('hajj','umrah')),
  name text NOT NULL,
  season text,
  departure_date date,
  return_date date,
  makkah_hotel text,
  makkah_nights int NOT NULL DEFAULT 0,
  madinah_hotel text,
  madinah_nights int NOT NULL DEFAULT 0,
  airline text,
  flight_details text,
  transport_details text,
  capacity int NOT NULL DEFAULT 0,
  price_quad numeric(12,2) NOT NULL DEFAULT 0,
  price_triple numeric(12,2) NOT NULL DEFAULT 0,
  price_double numeric(12,2) NOT NULL DEFAULT 0,
  price_single numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','full','closed','departed','completed','cancelled')),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilgrimage_programs TO authenticated;
GRANT ALL ON public.pilgrimage_programs TO service_role;
ALTER TABLE public.pilgrimage_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read programs" ON public.pilgrimage_programs FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org writers manage programs" ON public.pilgrimage_programs FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager'));

-- Internal costs: separate table, managers only
CREATE TABLE public.pilgrimage_program_costs (
  program_id uuid PRIMARY KEY REFERENCES public.pilgrimage_programs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cost_per_person numeric(12,2) NOT NULL DEFAULT 0,
  cost_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilgrimage_program_costs TO authenticated;
GRANT ALL ON public.pilgrimage_program_costs TO service_role;
ALTER TABLE public.pilgrimage_program_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage program costs" ON public.pilgrimage_program_costs FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager'));

CREATE TABLE public.pilgrims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.pilgrimage_programs(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  gender text CHECK (gender IN ('male','female')),
  birth_date date,
  nationality text,
  national_id text,
  passport_number text,
  passport_expiry date,
  mahram_name text,
  mahram_relation text,
  room_type text NOT NULL DEFAULT 'quad' CHECK (room_type IN ('single','double','triple','quad')),
  room_group text,
  vaccination_done boolean NOT NULL DEFAULT false,
  documents_complete boolean NOT NULL DEFAULT false,
  visa_status text NOT NULL DEFAULT 'not_started' CHECK (visa_status IN ('not_started','submitted','issued','rejected')),
  visa_number text,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','documents_pending','visa_processing','ready','traveled','completed','cancelled')),
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilgrims TO authenticated;
GRANT ALL ON public.pilgrims TO service_role;
ALTER TABLE public.pilgrims ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.pilgrims(program_id);
CREATE POLICY "Org members read pilgrims" ON public.pilgrims FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org staff add pilgrims" ON public.pilgrims FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND public.get_user_org_role(auth.uid(), organization_id) <> 'viewer');
CREATE POLICY "Org staff update pilgrims" ON public.pilgrims FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND public.get_user_org_role(auth.uid(), organization_id) <> 'viewer')
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND public.get_user_org_role(auth.uid(), organization_id) <> 'viewer');
CREATE POLICY "Managers delete pilgrims" ON public.pilgrims FOR DELETE TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager'));

CREATE OR REPLACE FUNCTION public._pilgrim_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p public.pilgrimage_programs;
BEGIN
  SELECT * INTO p FROM public.pilgrimage_programs WHERE id = NEW.program_id;
  IF p.id IS NULL OR p.organization_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'program organization mismatch';
  END IF;
  NEW.paid_amount := GREATEST(0, NEW.paid_amount);
  NEW.total_price := GREATEST(0, NEW.total_price);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pilgrim_guard BEFORE INSERT OR UPDATE ON public.pilgrims
  FOR EACH ROW EXECUTE FUNCTION public._pilgrim_guard();
