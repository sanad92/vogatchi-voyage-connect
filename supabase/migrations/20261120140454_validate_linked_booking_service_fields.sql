CREATE FUNCTION pilgrimage_inventory_private.validate_linked_booking_service_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  parent public.bookings%ROWTYPE;
BEGIN
  IF NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND
    (NEW.booking_id, NEW.organization_id, NEW.customer_id, NEW.currency) IS NOT DISTINCT FROM
    (OLD.booking_id, OLD.organization_id, OLD.customer_id, OLD.currency) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND current_user = 'authenticated' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('linked-booking:' || NEW.booking_id::text, 0));
  END IF;

  SELECT * INTO parent FROM public.bookings WHERE id = NEW.booking_id;
  IF NOT FOUND OR parent.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'ملف الحجز غير متاح للمؤسسة الحالية' USING ERRCODE = '42501';
  END IF;
  IF parent.customer_id IS NOT NULL AND NEW.customer_id IS DISTINCT FROM parent.customer_id THEN
    RAISE EXCEPTION 'استخدم نفس عميل ملف الحجز لإضافة الخدمة' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(parent.currency), '') IS NOT NULL AND
     upper(btrim(parent.currency)) IS DISTINCT FROM upper(btrim(NEW.currency)) THEN
    RAISE EXCEPTION 'حوّل مبلغ الخدمة لعملة ملف الحجز قبل الإضافة' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION pilgrimage_inventory_private.sync_linked_service_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Privileged imports control their own invoice lifecycle.
  IF current_user <> 'authenticated' OR NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  result := public.sync_booking_financials(NEW.booking_id);
  IF result->>'reason' = 'locked' THEN
    RAISE EXCEPTION 'الفاتورة مقفلة. استخدم مسار تعديل الحجز' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION pilgrimage_inventory_private.validate_linked_booking_service_fields(),
  pilgrimage_inventory_private.sync_linked_service_insert() FROM PUBLIC, anon;

DO $$
DECLARE
  service_table text;
BEGIN
  FOREACH service_table IN ARRAY ARRAY['hotel_bookings', 'flight_bookings', 'transport_bookings', 'car_rentals'] LOOP
    EXECUTE format('CREATE TRIGGER zz_validate_linked_booking_service_fields
      BEFORE INSERT OR UPDATE OF booking_id, organization_id, customer_id, currency ON public.%I
      FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.validate_linked_booking_service_fields()', service_table);
  END LOOP;
  FOREACH service_table IN ARRAY ARRAY['hotel_bookings', 'flight_bookings', 'transport_bookings', 'car_rentals'] LOOP
    EXECUTE format('CREATE TRIGGER zz_sync_linked_service_insert AFTER INSERT ON public.%I
      FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.sync_linked_service_insert()', service_table);
  END LOOP;
END;
$$;
