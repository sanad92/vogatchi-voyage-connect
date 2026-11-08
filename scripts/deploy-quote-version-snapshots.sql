-- Safar ERP — Quote Version Archive / Sprint 2
-- STAGED ONLY: do not apply to production before authenticated staging QA.
-- Immutable/manual snapshots of existing quotes + line items. Does NOT modify
-- the current quote, approval, accepted status, booking, invoice or payment.
BEGIN;

CREATE TABLE IF NOT EXISTS public.quote_version_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  quote_snapshot jsonb NOT NULL CHECK (jsonb_typeof(quote_snapshot)='object'),
  items_snapshot jsonb NOT NULL CHECK (jsonb_typeof(items_snapshot)='array'),
  item_count integer NOT NULL CHECK (item_count >= 1),
  content_hash text NOT NULL CHECK (length(content_hash)=32),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_version_snapshots_version_unique UNIQUE(quote_id,version_number),
  CONSTRAINT quote_version_snapshots_hash_unique UNIQUE(quote_id,content_hash)
);
CREATE INDEX IF NOT EXISTS quote_version_snapshots_org_quote_latest
  ON public.quote_version_snapshots(organization_id,quote_id,version_number DESC);

REVOKE ALL ON TABLE public.quote_version_snapshots FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.quote_version_snapshots TO authenticated;
GRANT ALL ON TABLE public.quote_version_snapshots TO service_role;
ALTER TABLE public.quote_version_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_version_snapshots_company_read ON public.quote_version_snapshots;
CREATE POLICY quote_version_snapshots_company_read
  ON public.quote_version_snapshots FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS(
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id=quote_version_snapshots.organization_id
        AND m.user_id=auth.uid() AND m.is_active IS TRUE
    )
    AND public.has_org_permission(organization_id,'quotes_view')
    AND public.has_org_permission(organization_id,'financial_view')
  );

CREATE OR REPLACE FUNCTION public.capture_quote_version_snapshot(
  p_quote_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  q public.quotes%ROWTYPE;
  v_items jsonb;
  v_header jsonb;
  v_hash text;
  v_existing public.quote_version_snapshots%ROWTYPE;
  v_version integer;
  v_id uuid;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR p_quote_id IS NULL THEN
    RAISE EXCEPTION 'invalid_quote_snapshot_request' USING ERRCODE='22023';
  END IF;

  -- Quote lock serializes version numbering and duplicate detection
  -- across simultaneous snapshot requests for the same quote.
  SELECT * INTO q
  FROM public.quotes WHERE id=p_quote_id
  FOR UPDATE;
  IF NOT FOUND OR q.organization_id IS NULL THEN
    RAISE EXCEPTION 'quote_not_found' USING ERRCODE='P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=q.organization_id
      AND m.user_id=auth.uid() AND m.is_active IS TRUE
  ) OR NOT coalesce(public.has_org_permission(q.organization_id,'quotes_edit'),false)
    OR NOT coalesce(public.has_org_permission(q.organization_id,'financial_view'),false)
  THEN
    RAISE EXCEPTION 'quote_snapshot_permission_denied' USING ERRCODE='42501';
  END IF;

  -- Lock current quote items while copying their structured details.
  PERFORM 1 FROM public.quote_items i
  WHERE i.quote_id=q.id AND i.organization_id=q.organization_id
  FOR SHARE;

  SELECT count(*), coalesce(jsonb_agg(
    jsonb_build_object(
      'item_id',i.id,
      'item_type',i.item_type,
      'description',i.description,
      'quantity',i.quantity,
      'supplier_id',i.supplier_id,
      'cost_price',i.cost_price,
      'selling_price',i.selling_price,
      'total_cost',i.total_cost,
      'total_selling',i.total_selling,
      'sort_order',i.sort_order,
      'details',coalesce(i.details,'{}'::jsonb)
    ) ORDER BY i.sort_order,i.id
  ),'[]'::jsonb)
  INTO v_count,v_items
  FROM public.quote_items i
  WHERE i.quote_id=q.id AND i.organization_id=q.organization_id;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'quote_snapshot_requires_items' USING ERRCODE='22023';
  END IF;

  v_header := jsonb_build_object(
    'quote_number',q.quote_number,
    'status',q.status,
    'customer_id',q.customer_id,
    'customer_name',q.customer_name,
    'destination',q.destination,
    'travel_date',q.travel_date,
    'return_date',q.return_date,
    'number_of_travelers',q.number_of_travelers,
    'currency',q.currency,
    'subtotal',q.subtotal,
    'discount_amount',q.discount_amount,
    'vat_rate',q.vat_rate,
    'vat_amount',q.vat_amount,
    'total_amount',q.total_amount,
    'total_cost',q.total_cost,
    'total_profit',q.total_profit,
    'valid_until',q.valid_until,
    'quote_updated_at',q.updated_at
  );

  -- MD5 is used only for change detection, NOT for authorization,
  -- passwords, signatures or data-integrity attestations.
  v_hash := md5((jsonb_build_object('quote',v_header,'items',v_items))::text);
  SELECT * INTO v_existing FROM public.quote_version_snapshots
  WHERE quote_id=q.id AND content_hash=v_hash;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id',v_existing.id,
      'version_number',v_existing.version_number,
      'unchanged',true
    );
  END IF;

  SELECT coalesce(max(version_number),0)+1 INTO v_version
  FROM public.quote_version_snapshots WHERE quote_id=q.id;

  INSERT INTO public.quote_version_snapshots(
    organization_id, quote_id, version_number, quote_snapshot,
    items_snapshot, item_count, content_hash, created_by
  ) VALUES(
    q.organization_id,q.id,v_version,v_header,v_items,v_count,v_hash,auth.uid()
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('id',v_id,'version_number',v_version,'unchanged',false);
END;
$$;

REVOKE ALL ON FUNCTION public.capture_quote_version_snapshot(uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.capture_quote_version_snapshot(uuid)
  TO authenticated;
COMMIT;
