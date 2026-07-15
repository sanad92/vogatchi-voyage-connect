
-- Extend whatsapp_templates with Template Center metadata (additive, backward compatible)
ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS category_key TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preview_variables JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variable_schema JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_template_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_status TEXT,
  ADD COLUMN IF NOT EXISTS meta_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_library_seed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS library_source_key TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'ar';

CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_templates_org_library_key
  ON public.whatsapp_templates(organization_id, library_source_key)
  WHERE library_source_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_templates_category_key
  ON public.whatsapp_templates(organization_id, category_key);

CREATE INDEX IF NOT EXISTS idx_wa_templates_meta_status
  ON public.whatsapp_templates(organization_id, meta_status);

-- Analytics table
CREATE TABLE IF NOT EXISTS public.whatsapp_template_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_language TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, template_name, template_language, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_template_analytics TO authenticated;
GRANT ALL ON public.whatsapp_template_analytics TO service_role;

ALTER TABLE public.whatsapp_template_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_tpl_analytics_org_read"
  ON public.whatsapp_template_analytics FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "wa_tpl_analytics_service_write"
  ON public.whatsapp_template_analytics FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wa_tpl_analytics_org_date
  ON public.whatsapp_template_analytics(organization_id, date DESC);

-- Trigger: increment usage_count + analytics when a template message is sent
CREATE OR REPLACE FUNCTION public.wa_template_track_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_tpl_id UUID;
BEGIN
  IF NEW.template_name IS NULL OR NEW.direction <> 'outbound' THEN
    RETURN NEW;
  END IF;

  SELECT c.organization_id INTO v_org
  FROM public.whatsapp_conversations c
  WHERE c.id = NEW.conversation_id;

  IF v_org IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_tpl_id
  FROM public.whatsapp_templates
  WHERE organization_id = v_org
    AND name = NEW.template_name
    AND (language = COALESCE(NEW.template_language, language))
  LIMIT 1;

  IF v_tpl_id IS NOT NULL THEN
    UPDATE public.whatsapp_templates
      SET usage_count = usage_count + 1,
          last_used_at = now()
      WHERE id = v_tpl_id;
  END IF;

  INSERT INTO public.whatsapp_template_analytics
    (organization_id, template_id, template_name, template_language, date, sent_count)
    VALUES (v_org, v_tpl_id, NEW.template_name, NEW.template_language, CURRENT_DATE, 1)
  ON CONFLICT (organization_id, template_name, template_language, date)
  DO UPDATE SET sent_count = whatsapp_template_analytics.sent_count + 1,
                updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_template_track_usage ON public.whatsapp_messages;
CREATE TRIGGER trg_wa_template_track_usage
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.wa_template_track_usage();

-- Trigger: update analytics status counters when message status transitions
CREATE OR REPLACE FUNCTION public.wa_template_track_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_date DATE;
BEGIN
  IF NEW.template_name IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT c.organization_id INTO v_org
  FROM public.whatsapp_conversations c
  WHERE c.id = NEW.conversation_id;

  IF v_org IS NULL THEN
    RETURN NEW;
  END IF;

  v_date := COALESCE(NEW.sent_at::date, CURRENT_DATE);

  IF NEW.status = 'delivered' THEN
    UPDATE public.whatsapp_template_analytics
      SET delivered_count = delivered_count + 1, updated_at = now()
      WHERE organization_id = v_org AND template_name = NEW.template_name
        AND COALESCE(template_language,'') = COALESCE(NEW.template_language,'')
        AND date = v_date;
  ELSIF NEW.status = 'read' THEN
    UPDATE public.whatsapp_template_analytics
      SET read_count = read_count + 1, updated_at = now()
      WHERE organization_id = v_org AND template_name = NEW.template_name
        AND COALESCE(template_language,'') = COALESCE(NEW.template_language,'')
        AND date = v_date;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.whatsapp_template_analytics
      SET failed_count = failed_count + 1, updated_at = now()
      WHERE organization_id = v_org AND template_name = NEW.template_name
        AND COALESCE(template_language,'') = COALESCE(NEW.template_language,'')
        AND date = v_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_template_track_status ON public.whatsapp_messages;
CREATE TRIGGER trg_wa_template_track_status
  AFTER UPDATE OF status ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.wa_template_track_status();
