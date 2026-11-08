-- Safar ERP Trip File 2.0 / Sprint 5
-- Structured source-document references for approved amendment handoffs.
-- STAGED ONLY. Requires Sprint 1 + Sprint 4 SQL already on STAGING.
-- Does not post financial transactions, issue tickets, book services or refund.
BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_change_source_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  change_request_id uuid NOT NULL,
  source_type text NOT NULL CHECK(
    source_type IN (
      'customer_invoice','supplier_invoice','customer_payment',
      'supplier_payment','generated_document'
    )
  ),
  source_id uuid NOT NULL,
  -- Point-in-time description only. Never treat it as settlement certification.
  status_at_link text,
  currency_at_link text,
  amount_at_link numeric,
  reference_at_link text,
  linked_by uuid NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_change_source_evidence_org_booking_fk
    FOREIGN KEY (change_request_id,organization_id,booking_id)
    REFERENCES public.booking_change_requests(id,organization_id,booking_id)
    ON DELETE RESTRICT,
  CONSTRAINT booking_change_source_evidence_unique
    UNIQUE (change_request_id,source_type,source_id)
);
CREATE INDEX IF NOT EXISTS booking_change_source_evidence_by_booking
 ON public.booking_change_source_evidence
 (organization_id,booking_id,linked_at DESC);

REVOKE ALL ON TABLE public.booking_change_source_evidence
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.booking_change_source_evidence TO authenticated;
GRANT ALL ON TABLE public.booking_change_source_evidence TO service_role;
ALTER TABLE public.booking_change_source_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_change_source_evidence_finance_read
  ON public.booking_change_source_evidence;
CREATE POLICY booking_change_source_evidence_finance_read
  ON public.booking_change_source_evidence FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id=auth.uid()
        AND m.organization_id=booking_change_source_evidence.organization_id
        AND m.is_active IS TRUE
    )
    AND public.has_org_permission(organization_id,'bookings_view')
    AND public.has_org_permission(organization_id,'financial_view')
  );

CREATE OR REPLACE FUNCTION public.link_booking_change_source_evidence(
  p_request_id uuid,
  p_source_type text,
  p_source_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  r public.booking_change_requests%ROWTYPE;
  h public.booking_change_handoffs%ROWTYPE;
  v_status text;
  v_currency text;
  v_amount numeric;
  v_reference text;
  v_link_id uuid;
BEGIN
  IF v_actor IS NULL OR p_request_id IS NULL OR p_source_id IS NULL
      OR p_source_type IS NULL OR p_source_type NOT IN (
        'customer_invoice','supplier_invoice','customer_payment',
        'supplier_payment','generated_document'
      ) THEN
    RAISE EXCEPTION 'invalid_source_evidence_request' USING ERRCODE='22023';
  END IF;

  -- Parent lock keeps the evidence link and current amendment state consistent
  -- with an approval/blocked-handoff transition made in a concurrent session.
  SELECT * INTO r FROM public.booking_change_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'amendment_not_found' USING ERRCODE='P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=r.organization_id
      AND m.user_id=v_actor AND m.is_active IS TRUE
  )
  OR NOT coalesce(public.has_org_permission(r.organization_id,'bookings_view'),false)
  OR NOT coalesce(public.has_org_permission(r.organization_id,'financial_view'),false)
  OR NOT coalesce(public.has_org_permission(r.organization_id,'financial_edit'),false)
  THEN
    RAISE EXCEPTION 'source_evidence_permission_denied' USING ERRCODE='42501';
  END IF;

  IF r.status <> 'approved' THEN
    RAISE EXCEPTION 'source_evidence_requires_approved_amendment'
      USING ERRCODE='22023';
  END IF;
  SELECT * INTO h FROM public.booking_change_handoffs
  WHERE change_request_id=r.id AND organization_id=r.organization_id
    AND booking_id=r.booking_id;
  IF NOT FOUND OR h.status NOT IN
      ('supplier_confirmed','finance_reviewed','execution_reported') THEN
    RAISE EXCEPTION 'source_evidence_requires_active_supplier_handoff'
      USING ERRCODE='22023';
  END IF;

  -- Important: every lookup includes both organization and original booking.
  -- The user-provided UUID cannot attach another company's financial record.
  IF p_source_type='customer_invoice' THEN
    SELECT coalesce(i.status,'unknown'),i.currency,i.final_amount,
      i.invoice_number
    INTO v_status,v_currency,v_amount,v_reference
    FROM public.invoices i
    WHERE i.id=p_source_id AND i.organization_id=r.organization_id
      AND i.booking_id=r.booking_id;
  ELSIF p_source_type='supplier_invoice' THEN
    SELECT coalesce(i.status,'unknown'),i.currency,i.amount,
      i.invoice_number
    INTO v_status,v_currency,v_amount,v_reference
    FROM public.supplier_invoices i
    WHERE i.id=p_source_id AND i.organization_id=r.organization_id
      AND i.booking_id=r.booking_id;
  ELSIF p_source_type='customer_payment' THEN
    SELECT coalesce(p.status,'unknown'),p.currency,p.amount,
      coalesce(p.reference_number,p.id::text)
    INTO v_status,v_currency,v_amount,v_reference
    FROM public.customer_payments p
    WHERE p.id=p_source_id AND p.organization_id=r.organization_id
      AND p.booking_id=r.booking_id;
  ELSIF p_source_type='supplier_payment' THEN
    SELECT coalesce(p.status,'unknown'),p.currency,p.amount,
      coalesce(p.reference_number,p.payment_reference,p.id::text)
    INTO v_status,v_currency,v_amount,v_reference
    FROM public.supplier_payments p
    WHERE p.id=p_source_id AND p.organization_id=r.organization_id
      AND p.booking_id=r.booking_id;
  ELSE
    SELECT 'document_record',d.currency,d.total_amount,d.document_number
    INTO v_status,v_currency,v_amount,v_reference
    FROM public.generated_documents d
    WHERE d.id=p_source_id AND d.organization_id=r.organization_id
      AND d.booking_id=r.booking_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'source_evidence_document_not_in_this_booking'
      USING ERRCODE='P0002';
  END IF;
  IF lower(coalesce(v_status,'')) IN
    ('cancelled','canceled','void','rejected','reversed','failed') THEN
    RAISE EXCEPTION 'void_source_document_cannot_be_newly_linked'
      USING ERRCODE='22023';
  END IF;

  INSERT INTO public.booking_change_source_evidence(
    organization_id,booking_id,change_request_id,
    source_type,source_id,status_at_link,currency_at_link,
    amount_at_link,reference_at_link,linked_by
  ) VALUES (
    r.organization_id,r.booking_id,r.id,
    p_source_type,p_source_id,left(v_status,80),left(v_currency,12),
    v_amount,left(v_reference,120),v_actor
  ) ON CONFLICT ON CONSTRAINT booking_change_source_evidence_unique
    DO NOTHING
  RETURNING id INTO v_link_id;

  IF v_link_id IS NULL THEN
    SELECT id INTO v_link_id
    FROM public.booking_change_source_evidence
    WHERE change_request_id=r.id
      AND organization_id=r.organization_id
      AND booking_id=r.booking_id
      AND source_type=p_source_type
      AND source_id=p_source_id;
    IF v_link_id IS NULL THEN
      RAISE EXCEPTION 'source_evidence_retry_conflict' USING ERRCODE='23505';
    END IF;
    RETURN jsonb_build_object('id',v_link_id,'replayed',true);
  END IF;

  INSERT INTO public.booking_timeline_events(
    organization_id,booking_id,kind,actor_id,summary,payload
  ) VALUES (
    r.organization_id,r.booking_id,'amendment_evidence_linked',v_actor,
    'تم ربط مستند من سجلات الشركة بطلب تعديل الحجز',
    jsonb_build_object(
      'change_request_id',r.id,'evidence_link_id',v_link_id,
      'source_type',p_source_type
    )
  );

  -- No mutation of source invoice/payment/document rows occurs.
  -- A matching ID only verifies booking+org ownership at link time.
  -- Neither a payment status nor 'document_record' proves actual refund.
  RETURN jsonb_build_object('id',v_link_id,'replayed',false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.link_booking_change_source_evidence(uuid,text,uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.link_booking_change_source_evidence(uuid,text,uuid)
  TO authenticated;

COMMIT;
