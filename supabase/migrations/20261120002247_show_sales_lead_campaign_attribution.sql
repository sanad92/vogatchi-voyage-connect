-- Keep the existing search signature and tenant check. Apply campaign matching before the workspace limit.
CREATE OR REPLACE FUNCTION public.sop_search_leads(
  _org uuid,
  _stages public.sop_lead_stage[] DEFAULT NULL,
  _owner uuid DEFAULT NULL,
  _source text DEFAULT NULL,
  _search text DEFAULT NULL,
  _follow_up text DEFAULT NULL,
  _include_legacy boolean DEFAULT false,
  _sort text DEFAULT 'updated_at',
  _limit integer DEFAULT 500
)
RETURNS SETOF public.sop_leads
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.has_org_permission(_org, 'crm_view'), false) THEN
    RAISE EXCEPTION 'غير مصرح لك بعرض العملاء المحتملين لهذه المؤسسة';
  END IF;

  IF _follow_up IS NOT NULL AND _follow_up NOT IN ('overdue', 'today', 'upcoming', 'none') THEN
    RAISE EXCEPTION 'فلتر المتابعة غير صالح';
  END IF;

  RETURN QUERY
  SELECT lead.*
  FROM public.sop_leads AS lead
  WHERE lead.organization_id = _org
    AND (_include_legacy OR NOT lead.is_legacy)
    AND (_stages IS NULL OR lead.stage = ANY (_stages))
    AND (_owner IS NULL OR lead.current_owner_id = _owner)
    AND (_source IS NULL OR lead.lead_source = _source)
    AND (
      NULLIF(btrim(_search), '') IS NULL
      OR lead.contact_name ILIKE '%' || btrim(_search) || '%'
      OR lead.contact_email ILIKE '%' || btrim(_search) || '%'
      OR lead.destination ILIKE '%' || btrim(_search) || '%'
      OR lead.city ILIKE '%' || btrim(_search) || '%'
      OR lead.lead_number ILIKE '%' || btrim(_search) || '%'
      OR lead.campaign ILIKE '%' || btrim(_search) || '%'
      OR (
        public.normalize_phone_digits(_search) IS NOT NULL
        AND public.normalize_phone_digits(lead.contact_phone)
          LIKE '%' || public.normalize_phone_digits(_search) || '%'
      )
    )
    AND (
      _follow_up IS NULL
      OR (_follow_up = 'overdue' AND lead.next_follow_up_at < now())
      OR (_follow_up = 'today'
        AND lead.next_follow_up_at >= date_trunc('day', now())
        AND lead.next_follow_up_at < date_trunc('day', now()) + interval '1 day')
      OR (_follow_up = 'upcoming'
        AND lead.next_follow_up_at >= date_trunc('day', now()) + interval '1 day')
      OR (_follow_up = 'none' AND lead.next_follow_up_at IS NULL)
    )
  ORDER BY
    CASE WHEN _sort = 'arrival_asc' THEN lead.check_in END ASC NULLS LAST,
    CASE WHEN _sort = 'arrival_desc' THEN lead.check_in END DESC NULLS LAST,
    CASE WHEN _sort = 'follow_up' THEN lead.next_follow_up_at END ASC NULLS LAST,
    lead.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 500), 1), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.sop_search_leads(
  uuid, public.sop_lead_stage[], uuid, text, text, text, boolean, text, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_search_leads(
  uuid, public.sop_lead_stage[], uuid, text, text, text, boolean, text, integer
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION operations_private.protect_meta_lead_attribution()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL AND current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.lead_source = 'meta_lead_ads' THEN
      IF (NEW.lead_source, NEW.campaign) IS DISTINCT FROM (OLD.lead_source, OLD.campaign) THEN
        RAISE EXCEPTION 'meta_lead_attribution_is_provider_managed' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.lead_source = 'meta_lead_ads' THEN
    RAISE EXCEPTION 'meta_lead_attribution_is_provider_managed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION operations_private.protect_meta_lead_attribution() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE TRIGGER protect_meta_lead_attribution
BEFORE INSERT OR UPDATE OF lead_source, campaign ON public.sop_leads
FOR EACH ROW EXECUTE FUNCTION operations_private.protect_meta_lead_attribution();
