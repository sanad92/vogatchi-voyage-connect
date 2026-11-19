CREATE INDEX whatsapp_meta_deletion_confirmation_idx
  ON public.whatsapp_connection_events ((payload->>'confirmation_code'))
  WHERE event_type = 'meta_data_deletion_request' AND organization_id IS NULL;

CREATE FUNCTION public.record_meta_deletion_request(_meta_user_id text, _confirmation_code uuid)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF nullif(btrim(_meta_user_id), '') IS NULL OR _confirmation_code IS NULL THEN
    RAISE EXCEPTION 'Invalid data deletion request' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.whatsapp_connection_events (organization_id, event_type, payload)
  VALUES (NULL, 'meta_data_deletion_request',
    jsonb_build_object('meta_user_id', _meta_user_id, 'confirmation_code', _confirmation_code, 'received_at', now()));

  UPDATE public.whatsapp_settings
  SET access_token = NULL, is_active = false, onboarding_status = 'disconnected', disconnected_at = now()
  WHERE meta_user_id = _meta_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_meta_deletion_request(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_meta_deletion_request(text, uuid) TO service_role;

CREATE FUNCTION public.verify_meta_deletion_confirmation(_confirmation_code uuid)
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
