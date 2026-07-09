
CREATE TABLE IF NOT EXISTS public.whatsapp_sla_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  timezone text NOT NULL DEFAULT 'Asia/Riyadh',
  business_hours jsonb NOT NULL DEFAULT '{
    "sun":{"enabled":true,"open":"09:00","close":"18:00"},
    "mon":{"enabled":true,"open":"09:00","close":"18:00"},
    "tue":{"enabled":true,"open":"09:00","close":"18:00"},
    "wed":{"enabled":true,"open":"09:00","close":"18:00"},
    "thu":{"enabled":true,"open":"09:00","close":"18:00"},
    "fri":{"enabled":false,"open":"09:00","close":"18:00"},
    "sat":{"enabled":false,"open":"09:00","close":"18:00"}
  }'::jsonb,
  sla_first_response_minutes integer NOT NULL DEFAULT 15,
  sla_resolution_minutes integer NOT NULL DEFAULT 1440,
  out_of_hours_message text,
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_sla_settings TO authenticated;
GRANT ALL ON public.whatsapp_sla_settings TO service_role;

ALTER TABLE public.whatsapp_sla_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_sla_select" ON public.whatsapp_sla_settings
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "wa_sla_insert" ON public.whatsapp_sla_settings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "wa_sla_update" ON public.whatsapp_sla_settings
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_wa_sla_updated_at
  BEFORE UPDATE ON public.whatsapp_sla_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS sla_breached_first_response boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_breached_resolution boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_first_response_deadline timestamptz;
