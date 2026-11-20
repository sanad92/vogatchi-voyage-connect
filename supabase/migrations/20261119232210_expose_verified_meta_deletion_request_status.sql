CREATE INDEX IF NOT EXISTS whatsapp_meta_deletion_confirmation_idx
  ON public.whatsapp_connection_events ((payload->>'confirmation_code'))
  WHERE event_type = 'meta_data_deletion_request' AND organization_id IS NULL;

CREATE OR REPLACE FUNCTION public.verify_meta_deletion_confirmation(_confirmation_code uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_connection_events
    WHERE event_type = 'meta_data_deletion_request'
      AND organization_id IS NULL
      AND payload->>'confirmation_code' = _confirmation_code::text
  );
$$;

REVOKE ALL ON FUNCTION public.verify_meta_deletion_confirmation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_meta_deletion_confirmation(uuid) TO anon, authenticated;
