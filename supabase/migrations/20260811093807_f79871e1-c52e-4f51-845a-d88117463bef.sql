ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS provider_error_code text,
  ADD COLUMN IF NOT EXISTS provider_error_message text,
  ADD COLUMN IF NOT EXISTS provider_response jsonb,
  ADD COLUMN IF NOT EXISTS correlation_id text;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_correlation_id
  ON public.whatsapp_messages (correlation_id);

CREATE OR REPLACE FUNCTION public.wa_count_placeholders(_text text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT MAX(m[1]::int) FROM regexp_matches(COALESCE(_text,''), '\{\{\s*(\d+)\s*\}\}', 'g') AS m), 0)
       + COALESCE((SELECT COUNT(DISTINCT m[1]) FROM regexp_matches(COALESCE(_text,''), '\{\{\s*([^}[:space:][:digit:]][^}[:space:]]*)\s*\}\}', 'g') AS m), 0)::int;
$$;

REVOKE EXECUTE ON FUNCTION public.wa_count_placeholders(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.wa_count_placeholders(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.wa_count_placeholders(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wa_count_placeholders(text) TO service_role;

UPDATE public.whatsapp_templates t
SET body_variable_count = public.wa_count_placeholders(t.body_text)
WHERE COALESCE(t.body_variable_count, 0) < public.wa_count_placeholders(t.body_text);

UPDATE public.whatsapp_templates t
SET header_variable_count = public.wa_count_placeholders(t.header_text)
WHERE COALESCE(t.header_variable_count, 0) < public.wa_count_placeholders(t.header_text);