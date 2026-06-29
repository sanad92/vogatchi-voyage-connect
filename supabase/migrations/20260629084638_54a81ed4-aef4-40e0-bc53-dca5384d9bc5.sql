
-- (أ) إنشاء موردين وربط الحجوزات
WITH norm AS (
  SELECT b.organization_id,
         lower(btrim(b.supplier_name)) AS sname_norm,
         MAX(b.supplier_name) AS display_name
  FROM public.bookings b
  WHERE b.supplier_name IS NOT NULL
    AND btrim(b.supplier_name) <> ''
    AND b.supplier_id IS NULL
  GROUP BY b.organization_id, lower(btrim(b.supplier_name))
)
INSERT INTO public.suppliers (organization_id, name, supplier_type, is_active, notes)
SELECT n.organization_id, n.display_name, 'other', true,
       'تم الإنشاء تلقائياً من استيراد الحجوزات'
FROM norm n
WHERE NOT EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.organization_id = n.organization_id
    AND lower(btrim(s.name)) = n.sname_norm
);

UPDATE public.bookings b
SET supplier_id = s.id
FROM public.suppliers s
WHERE b.supplier_id IS NULL
  AND b.supplier_name IS NOT NULL
  AND s.organization_id = b.organization_id
  AND lower(btrim(s.name)) = lower(btrim(b.supplier_name));

-- (ب) دالة مساعدة لإنشاء قيد محاسبي من حجز
CREATE OR REPLACE FUNCTION public.booking_make_journal(b public.bookings)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_lines jsonb;
  v_revenue_code text;
  v_cost_code text;
  v_sale numeric;
  v_cost numeric;
BEGIN
  IF b.organization_id IS NULL THEN RETURN; END IF;
  v_sale := COALESCE(b.selling_price, 0);
  v_cost := COALESCE(b.cost_price, 0);
  IF v_sale = 0 AND v_cost = 0 THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries
             WHERE reference_type='booking' AND reference_id = b.id) THEN
    RETURN;
  END IF;

  v_revenue_code := CASE LOWER(COALESCE(b.booking_type,'hotel'))
    WHEN 'flight' THEN '4010'
    WHEN 'transport' THEN '4020'
    WHEN 'car' THEN '4030'
    WHEN 'car_rental' THEN '4030'
    WHEN 'package' THEN '4040'
    ELSE '4000' END;
  v_cost_code := CASE LOWER(COALESCE(b.booking_type,'hotel'))
    WHEN 'flight' THEN '5010'
    WHEN 'transport' THEN '5020'
    WHEN 'car' THEN '5030'
    WHEN 'car_rental' THEN '5030'
    ELSE '5000' END;

  v_lines := '[]'::jsonb;
  IF v_sale > 0 THEN
    v_lines := v_lines
      || jsonb_build_object('account_code','1100','debit',v_sale,'credit',0,'description','ذمم عميل - ' || COALESCE(b.customer_name,''))
      || jsonb_build_object('account_code',v_revenue_code,'debit',0,'credit',v_sale,'description','إيراد حجز ' || COALESCE(b.booking_number,''));
  END IF;
  IF v_cost > 0 THEN
    v_lines := v_lines
      || jsonb_build_object('account_code',v_cost_code,'debit',v_cost,'credit',0,'description','تكلفة حجز ' || COALESCE(b.booking_number,''))
      || jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','ذمم مورد - ' || COALESCE(b.supplier_name,''));
  END IF;

  IF jsonb_array_length(v_lines) > 0 THEN
    PERFORM public.post_journal_entry(
      b.organization_id,
      COALESCE(b.start_date, b.created_at::date, CURRENT_DATE),
      'حجز ' || COALESCE(b.booking_number,''),
      'booking', b.id, v_lines,
      COALESCE(b.currency,'EGP'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'booking journal failed for %: %', b.id, SQLERRM;
END $$;

-- (ج) Trigger
CREATE OR REPLACE FUNCTION public.trg_booking_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF COALESCE(NEW.status,'') IN ('confirmed','completed','ticketed','paid') THEN
    PERFORM public.booking_make_journal(NEW);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_to_journal_ins ON public.bookings;
CREATE TRIGGER trg_booking_to_journal_ins
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_booking_to_journal();

DROP TRIGGER IF EXISTS trg_booking_to_journal_upd ON public.bookings;
CREATE TRIGGER trg_booking_to_journal_upd
AFTER UPDATE OF status, selling_price, cost_price ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_booking_to_journal();

-- (د) ترحيل تاريخي
DO $$
DECLARE r public.bookings%ROWTYPE;
BEGIN
  FOR r IN
    SELECT * FROM public.bookings
    WHERE COALESCE(status,'') IN ('confirmed','completed','ticketed','paid')
      AND (COALESCE(selling_price,0) > 0 OR COALESCE(cost_price,0) > 0)
      AND NOT EXISTS (SELECT 1 FROM public.journal_entries je
                      WHERE je.reference_type='booking' AND je.reference_id = bookings.id)
  LOOP
    PERFORM public.booking_make_journal(r);
  END LOOP;
END $$;

-- (هـ) RPC لإحصاء النواقص
CREATE OR REPLACE FUNCTION public.get_incomplete_records(_org_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'bookings_missing_dates',
      (SELECT count(*) FROM public.bookings
       WHERE organization_id=_org_id AND (start_date IS NULL OR end_date IS NULL)),
    'bookings_missing_prices',
      (SELECT count(*) FROM public.bookings
       WHERE organization_id=_org_id
         AND (selling_price IS NULL OR cost_price IS NULL
              OR selling_price = 0 OR cost_price = 0)),
    'bookings_missing_supplier',
      (SELECT count(*) FROM public.bookings
       WHERE organization_id=_org_id AND supplier_id IS NULL),
    'bookings_no_customer',
      (SELECT count(*) FROM public.bookings
       WHERE organization_id=_org_id AND customer_id IS NULL),
    'customers_no_phone',
      (SELECT count(*) FROM public.customers
       WHERE organization_id=_org_id AND (phone IS NULL OR btrim(phone)='')),
    'customers_no_email',
      (SELECT count(*) FROM public.customers
       WHERE organization_id=_org_id AND (email IS NULL OR btrim(email)=''))
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_incomplete_records(uuid) TO authenticated, service_role;
