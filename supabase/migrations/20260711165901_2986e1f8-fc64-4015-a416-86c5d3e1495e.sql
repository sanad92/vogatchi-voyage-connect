
-- 1) whatsapp_settings: allow multiple rows per organization
DROP INDEX IF EXISTS public.whatsapp_settings_org_unique;
DROP INDEX IF EXISTS public.whatsapp_settings_waba_unique;

ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Unique per (org, phone_number_id) — a phone can only be registered once per org
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_settings_org_phone_unique
  ON public.whatsapp_settings (organization_id, phone_number_id)
  WHERE organization_id IS NOT NULL AND phone_number_id IS NOT NULL;

-- Unique phone_number_id globally (Meta phone ids are globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_settings_phone_id_unique
  ON public.whatsapp_settings (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

-- Only one default per organization
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_settings_one_default_per_org
  ON public.whatsapp_settings (organization_id)
  WHERE is_default = true AND organization_id IS NOT NULL;

-- Mark the current sole row per org as default (backfill)
UPDATE public.whatsapp_settings s
SET is_default = true
WHERE organization_id IS NOT NULL
  AND is_default = false
  AND NOT EXISTS (
    SELECT 1 FROM public.whatsapp_settings s2
    WHERE s2.organization_id = s.organization_id AND s2.is_default = true
  )
  AND id = (
    SELECT id FROM public.whatsapp_settings s3
    WHERE s3.organization_id = s.organization_id
    ORDER BY created_at ASC NULLS LAST, id ASC
    LIMIT 1
  );

-- 2) Add whatsapp_settings_id to related tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'whatsapp_conversations',
    'whatsapp_messages',
    'whatsapp_broadcasts',
    'whatsapp_broadcast_recipients',
    'whatsapp_templates',
    'whatsapp_followups',
    'whatsapp_automation_rules_v2',
    'whatsapp_chatbot_settings',
    'whatsapp_sla_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS whatsapp_settings_id uuid REFERENCES public.whatsapp_settings(id) ON DELETE CASCADE',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id, whatsapp_settings_id)',
      'idx_' || t || '_org_settings', t
    );
  END LOOP;
END $$;

-- 3) Backfill whatsapp_settings_id from single-row-per-org whatsapp_settings
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'whatsapp_conversations',
    'whatsapp_messages',
    'whatsapp_broadcasts',
    'whatsapp_broadcast_recipients',
    'whatsapp_templates',
    'whatsapp_followups',
    'whatsapp_automation_rules_v2',
    'whatsapp_chatbot_settings',
    'whatsapp_sla_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($f$
      UPDATE public.%I tgt
      SET whatsapp_settings_id = s.id
      FROM public.whatsapp_settings s
      WHERE tgt.whatsapp_settings_id IS NULL
        AND tgt.organization_id IS NOT NULL
        AND s.organization_id = tgt.organization_id
        AND s.is_default = true
    $f$, t);
  END LOOP;
END $$;

-- 4) Trigger: ensure only one default per org (belt-and-braces alongside partial unique index)
CREATE OR REPLACE FUNCTION public.ensure_single_default_whatsapp_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true AND NEW.organization_id IS NOT NULL THEN
    UPDATE public.whatsapp_settings
    SET is_default = false
    WHERE organization_id = NEW.organization_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_single_default_whatsapp_number ON public.whatsapp_settings;
CREATE TRIGGER trg_ensure_single_default_whatsapp_number
BEFORE INSERT OR UPDATE OF is_default ON public.whatsapp_settings
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_whatsapp_number();
