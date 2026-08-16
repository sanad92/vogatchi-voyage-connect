-- Partial unique indexes cannot be inferred by ON CONFLICT (cols) without a
-- matching predicate, which PostgREST/supabase-js cannot express. Replace them
-- with plain unique indexes (NULLs remain distinct, so behaviour is unchanged).

DROP INDEX IF EXISTS public.idx_wa_templates_org_library_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_templates_org_library_key
  ON public.whatsapp_templates (organization_id, library_source_key);

DROP INDEX IF EXISTS public.whatsapp_settings_org_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_settings_org_phone_unique
  ON public.whatsapp_settings (organization_id, phone_number_id);