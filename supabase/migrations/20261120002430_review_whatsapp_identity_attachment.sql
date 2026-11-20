CREATE FUNCTION public.review_whatsapp_identity_attachment(_organization uuid, _conversation uuid, _message uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'storage_path', message.media_storage_path,
    'mime_type', media.mime_type,
    'customer', CASE WHEN customer.id IS NOT NULL THEN jsonb_build_object(
      'id', customer.id, 'name', customer.name, 'nationality', customer.nationality, 'updated_at', customer.updated_at
    ) END
  )
  FROM public.whatsapp_messages AS message
  JOIN public.whatsapp_conversations AS conversation
    ON conversation.id = message.conversation_id AND conversation.organization_id = message.organization_id
  CROSS JOIN LATERAL (SELECT lower(btrim(split_part(message.media_mime_type, ';', 1))) AS mime_type) AS media
  LEFT JOIN public.customers AS customer
    ON customer.id = conversation.customer_id AND customer.organization_id = conversation.organization_id
      AND customer.archived_at IS NULL AND NOT customer.is_demo
  WHERE message.id = _message AND conversation.id = _conversation AND conversation.organization_id = _organization
    AND message.direction = 'inbound' AND message.message_type IN ('image', 'document')
    AND message.media_download_status = 'success'
    AND media.mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    AND message.message_id IS NOT NULL AND message.message_id <> '' AND strpos(message.message_id, '/') = 0
    AND message.media_storage_path = concat(
      conversation.organization_id, '/', conversation.id, '/', message.message_id, '.',
      CASE media.mime_type WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png'
        WHEN 'image/webp' THEN 'webp' WHEN 'application/pdf' THEN 'pdf' END
    )
    AND auth.uid() IS NOT NULL AND coalesce(public.has_org_permission(_organization, 'whatsapp_view'), false)
    AND coalesce(public.has_org_permission(_organization, 'customers_edit'), false)
    AND EXISTS (SELECT 1 FROM public.organization_members AS member
      WHERE member.organization_id = _organization AND member.user_id = auth.uid() AND member.is_active)
    AND (coalesce(public.has_org_permission(_organization, 'whatsapp_admin'), false)
      OR EXISTS (
        SELECT 1 FROM public.profiles AS profile
        JOIN public.employees AS employee ON employee.id = profile.linked_employee_id
          AND employee.organization_id = _organization AND employee.is_active
        WHERE profile.id = auth.uid() AND employee.id = conversation.assigned_to
      ));
$$;

CREATE FUNCTION public.apply_whatsapp_identity_review(
  _organization uuid, _conversation uuid, _message uuid, _customer uuid,
  _source_path text, _expected_updated_at timestamptz, _name text, _nationality text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  saved uuid;
  new_name text := nullif(btrim(_name), '');
  new_nationality text := nullif(btrim(_nationality), '');
BEGIN
  IF (new_name IS NULL AND new_nationality IS NULL)
    OR (new_name IS NOT NULL AND (char_length(new_name) NOT BETWEEN 2 AND 120
      OR new_name !~ '^[[:alpha:]][[:alpha:] .''’-]*$'))
    OR (new_nationality IS NOT NULL AND (char_length(new_nationality) NOT BETWEEN 2 AND 70
      OR new_nationality !~ '^[[:alpha:]][[:alpha:] .''’-]*$'))
  THEN
    RAISE EXCEPTION 'identity_review_fields_invalid' USING ERRCODE = '22023';
  END IF;
  IF NOT coalesce(public.can_org_write(_organization), false) THEN
    RAISE EXCEPTION 'identity_review_denied' USING ERRCODE = '42501';
  END IF;

  WITH reviewed AS (
    SELECT public.review_whatsapp_identity_attachment(_organization, _conversation, _message) AS value
  )
  UPDATE public.customers AS customer
  SET name = coalesce(new_name, customer.name),
    nationality = coalesce(new_nationality, customer.nationality),
    updated_at = now()
  FROM reviewed
  WHERE customer.id = _customer AND customer.organization_id = _organization
    AND customer.archived_at IS NULL AND NOT customer.is_demo
    AND customer.updated_at IS NOT DISTINCT FROM _expected_updated_at
    AND reviewed.value->'customer'->>'id' = customer.id::text
    AND reviewed.value->>'storage_path' = _source_path
  RETURNING customer.id INTO saved;

  IF saved IS NULL THEN
    RAISE EXCEPTION 'identity_review_changed_or_unavailable' USING ERRCODE = '40001';
  END IF;
  RETURN saved;
END;
$$;

REVOKE ALL ON FUNCTION public.review_whatsapp_identity_attachment(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_whatsapp_identity_review(uuid, uuid, uuid, uuid, text, timestamptz, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_whatsapp_identity_attachment(uuid, uuid, uuid),
  public.apply_whatsapp_identity_review(uuid, uuid, uuid, uuid, text, timestamptz, text, text)
  TO authenticated;
