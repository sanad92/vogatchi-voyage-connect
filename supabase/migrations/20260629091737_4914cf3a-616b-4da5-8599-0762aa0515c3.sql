
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS data_quality_status text
    CHECK (data_quality_status IN ('ok','review_needed','incomplete'))
    DEFAULT 'ok';

UPDATE public.bookings
SET data_quality_status = 'review_needed'
WHERE COALESCE(profit, 0) < 0 AND COALESCE(data_quality_status,'ok') = 'ok';

UPDATE public.bookings
SET data_quality_status = 'incomplete'
WHERE (COALESCE(selling_price,0) = 0 OR customer_id IS NULL OR start_date IS NULL)
  AND data_quality_status = 'ok';

INSERT INTO public.bookings (
  organization_id, booking_number, booking_type, customer_id, customer_name,
  supplier_id, supplier_name, status, selling_price, cost_price, profit,
  currency, start_date, end_date, legacy_table, legacy_id, created_at
)
SELECT
  hb.organization_id,
  COALESCE(hb.internal_booking_number, 'HB-MIG-' || substr(hb.id::text, 1, 8)),
  'hotel', hb.customer_id, hb.customer_name, hb.supplier_id, hb.supplier_name,
  'pending',
  COALESCE(hb.total_cost_customer, 0),
  COALESCE(hb.total_cost_customer, 0) - COALESCE(hb.total_profit, 0),
  COALESCE(hb.total_profit, 0),
  COALESCE(hb.currency, 'EGP'),
  hb.check_in_date, hb.check_out_date,
  'hotel_bookings', hb.id, hb.created_at
FROM public.hotel_bookings hb
WHERE hb.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.legacy_table='hotel_bookings' AND b.legacy_id=hb.id)
ON CONFLICT DO NOTHING;

DO $$
DECLARE b public.bookings%ROWTYPE;
BEGIN
  FOR b IN
    SELECT bk.* FROM public.bookings bk
    WHERE NOT EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.reference_type='booking' AND je.reference_id=bk.id)
      AND COALESCE(bk.selling_price,0) > 0
  LOOP
    PERFORM public.booking_make_journal(b);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.trg_validate_invoice_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_booking record;
BEGIN
  IF NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = NEW.booking_id;
  IF v_booking IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(v_booking.selling_price, 0) = 0 THEN
    RAISE EXCEPTION 'لا يمكن إصدار فاتورة لحجز بدون سعر بيع (BK %)', v_booking.booking_number;
  END IF;
  IF v_booking.customer_id IS NULL THEN
    RAISE EXCEPTION 'لا يمكن إصدار فاتورة لحجز بدون عميل (BK %)', v_booking.booking_number;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_invoice_before_insert ON public.invoices;
CREATE TRIGGER trg_validate_invoice_before_insert
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_invoice_before_insert();

CREATE OR REPLACE FUNCTION public.get_incomplete_records(_org_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'bookings_missing_dates',
      (SELECT count(*) FROM public.bookings WHERE organization_id=_org_id AND (start_date IS NULL OR end_date IS NULL)),
    'bookings_missing_prices',
      (SELECT count(*) FROM public.bookings WHERE organization_id=_org_id
         AND (selling_price IS NULL OR cost_price IS NULL OR selling_price=0 OR cost_price=0)),
    'bookings_missing_supplier',
      (SELECT count(*) FROM public.bookings WHERE organization_id=_org_id AND supplier_id IS NULL),
    'bookings_no_customer',
      (SELECT count(*) FROM public.bookings WHERE organization_id=_org_id AND customer_id IS NULL),
    'bookings_negative_profit',
      (SELECT count(*) FROM public.bookings WHERE organization_id=_org_id AND COALESCE(profit,0) < 0),
    'bookings_no_journal',
      (SELECT count(*) FROM public.bookings b WHERE b.organization_id=_org_id AND COALESCE(b.selling_price,0)>0
         AND NOT EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.reference_type='booking' AND je.reference_id=b.id)),
    'customers_no_phone',
      (SELECT count(*) FROM public.customers WHERE organization_id=_org_id AND (phone IS NULL OR btrim(phone)='')),
    'customers_no_email',
      (SELECT count(*) FROM public.customers WHERE organization_id=_org_id AND (email IS NULL OR btrim(email)=''))
  )
$$;
