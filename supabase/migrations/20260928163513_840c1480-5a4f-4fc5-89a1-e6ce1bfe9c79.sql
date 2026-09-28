-- Price catalog synced from the company price sheet (selling prices only)
CREATE TABLE IF NOT EXISTS public.ai_price_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_tab text NOT NULL,
  source_row integer NOT NULL,
  category text NOT NULL DEFAULT 'hotel',
  destination text NOT NULL,
  name text NOT NULL,
  rating text,
  board text,
  valid_from date,
  valid_to date,
  price_single numeric,
  price_double numeric,
  price_triple numeric,
  currency text NOT NULL DEFAULT 'EGP',
  unit text NOT NULL DEFAULT 'per_room_per_night',
  notes text,
  supplement text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_tab, source_row)
);

GRANT SELECT ON public.ai_price_catalog TO authenticated;
GRANT ALL ON public.ai_price_catalog TO service_role;
ALTER TABLE public.ai_price_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read price catalog"
ON public.ai_price_catalog FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m
  WHERE m.organization_id = ai_price_catalog.organization_id
    AND m.user_id = auth.uid() AND m.is_active = true
));

CREATE INDEX IF NOT EXISTS ai_price_catalog_org_dest_idx
  ON public.ai_price_catalog (organization_id, destination);

-- Sync runs for the price sheet
CREATE TABLE IF NOT EXISTS public.ai_price_catalog_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  spreadsheet_id text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  rows_imported integer NOT NULL DEFAULT 0,
  tabs_imported integer NOT NULL DEFAULT 0,
  error_message text,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_price_catalog_syncs TO authenticated;
GRANT ALL ON public.ai_price_catalog_syncs TO service_role;
ALTER TABLE public.ai_price_catalog_syncs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read price syncs"
ON public.ai_price_catalog_syncs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m
  WHERE m.organization_id = ai_price_catalog_syncs.organization_id
    AND m.user_id = auth.uid() AND m.is_active = true
));

-- Qualification brief captured by the AI sales agent per conversation
CREATE TABLE IF NOT EXISTS public.ai_sales_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  destination text,
  travel_from date,
  travel_to date,
  adults integer,
  children integer,
  children_ages text,
  budget_range text,
  trip_type text,
  board_preference text,
  notes text,
  suggested_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  readiness text NOT NULL DEFAULT 'collecting',
  handed_off_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, conversation_id)
);

GRANT SELECT, UPDATE ON public.ai_sales_briefs TO authenticated;
GRANT ALL ON public.ai_sales_briefs TO service_role;
ALTER TABLE public.ai_sales_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read sales briefs"
ON public.ai_sales_briefs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m
  WHERE m.organization_id = ai_sales_briefs.organization_id
    AND m.user_id = auth.uid() AND m.is_active = true
));

CREATE POLICY "Org writers update sales briefs"
ON public.ai_sales_briefs FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m
  WHERE m.organization_id = ai_sales_briefs.organization_id
    AND m.user_id = auth.uid() AND m.is_active = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.organization_members m
  WHERE m.organization_id = ai_sales_briefs.organization_id
    AND m.user_id = auth.uid() AND m.is_active = true
));

CREATE TRIGGER ai_price_catalog_updated_at BEFORE UPDATE ON public.ai_price_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ai_price_catalog_syncs_updated_at BEFORE UPDATE ON public.ai_price_catalog_syncs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ai_sales_briefs_updated_at BEFORE UPDATE ON public.ai_sales_briefs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sales-agent configuration on the existing chatbot settings
ALTER TABLE public.whatsapp_chatbot_settings
  ADD COLUMN IF NOT EXISTS price_sheet_id text,
  ADD COLUMN IF NOT EXISTS sales_agent_enabled boolean NOT NULL DEFAULT false;
