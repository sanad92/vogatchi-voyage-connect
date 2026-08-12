
-- collapse duplicates: same lead + action + second, keep the most informative row
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY lead_id, action, date_trunc('second', occurred_at)
    ORDER BY (actor_user_id IS NULL), (reason IS NULL), created_at
  ) rn
  FROM public.sop_lead_stage_history
)
DELETE FROM public.sop_lead_stage_history h USING ranked r
 WHERE h.id = r.id AND r.rn > 1;

CREATE INDEX IF NOT EXISTS idx_slsh_lead_action_time
  ON public.sop_lead_stage_history (lead_id, action, occurred_at);

CREATE OR REPLACE FUNCTION public.sop_history_write(
  _org uuid, _lead uuid, _action text, _from public.sop_lead_stage, _to public.sop_lead_stage,
  _actor uuid, _reason text, _source text, _reconstructed boolean,
  _pricing uuid, _quote uuid, _booking uuid, _meta jsonb, _at timestamptz, _key text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_at timestamptz := coalesce(_at, now()); v_existing uuid;
BEGIN
  IF _lead IS NULL OR _org IS NULL THEN RETURN; END IF;

  SELECT id INTO v_existing FROM public.sop_lead_stage_history
   WHERE lead_id = _lead AND action = _action
     AND date_trunc('second', occurred_at) = date_trunc('second', v_at)
   LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- enrich an existing row rather than duplicating it
    UPDATE public.sop_lead_stage_history
       SET actor_user_id = coalesce(actor_user_id, _actor),
           actor_name = coalesce(actor_name, public.sop_actor_name(_actor)),
           reason = coalesce(reason, NULLIF(_reason,'')),
           pricing_request_id = coalesce(pricing_request_id, _pricing),
           quote_id = coalesce(quote_id, _quote),
           booking_id = coalesce(booking_id, _booking)
     WHERE id = v_existing;
    RETURN;
  END IF;

  INSERT INTO public.sop_lead_stage_history (
    organization_id, lead_id, action, from_stage, to_stage, actor_user_id, actor_name,
    reason, source, is_reconstructed, pricing_request_id, quote_id, booking_id, metadata, occurred_at, dedupe_key)
  VALUES (_org, _lead, _action, _from, _to, _actor, public.sop_actor_name(_actor),
    NULLIF(_reason,''), coalesce(_source,'trigger'), coalesce(_reconstructed,false),
    _pricing, _quote, _booking, coalesce(_meta,'{}'::jsonb), v_at, _key)
  ON CONFLICT DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.sop_history_write(uuid,uuid,text,public.sop_lead_stage,public.sop_lead_stage,uuid,text,text,boolean,uuid,uuid,uuid,jsonb,timestamptz,text) FROM anon, public;
