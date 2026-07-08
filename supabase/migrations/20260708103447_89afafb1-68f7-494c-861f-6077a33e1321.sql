
-- Add columns to whatsapp_settings for OAuth-based multi-tenant flow
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'pending' CHECK (onboarding_status IN ('pending','connected','failed','disconnected')),
  ADD COLUMN IF NOT EXISTS disconnected_at timestamptz;

-- Unique index on waba_id for webhook routing (partial: only when set)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_settings_waba_unique
  ON public.whatsapp_settings (waba_id)
  WHERE waba_id IS NOT NULL;

-- Audit table for connection events
CREATE TABLE IF NOT EXISTS public.whatsapp_connection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wce_org ON public.whatsapp_connection_events(organization_id, created_at DESC);

GRANT SELECT ON public.whatsapp_connection_events TO authenticated;
GRANT ALL ON public.whatsapp_connection_events TO service_role;

ALTER TABLE public.whatsapp_connection_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wce_select_org_admins" ON public.whatsapp_connection_events;
CREATE POLICY "wce_select_org_admins" ON public.whatsapp_connection_events
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL AND (
      public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role,'admin'::org_role])
      OR public.is_platform_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "wce_service_all" ON public.whatsapp_connection_events;
CREATE POLICY "wce_service_all" ON public.whatsapp_connection_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
