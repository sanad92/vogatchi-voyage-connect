-- Keep specialized lists on the source of truth for invoice balances and saved vouchers.
-- Existing *sent flags retain their historical meaning; an issued document is not delivery.
CREATE VIEW public.specialized_booking_finance_facts
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.organization_id,
  CASE WHEN permission.finance_scope = 'organization' OR permission.finance_scope = 'own'
    THEN totals.paid_amount END AS paid_amount,
  CASE WHEN permission.finance_scope = 'organization' OR permission.finance_scope = 'own'
    THEN totals.remaining_amount END AS remaining_amount,
  invoice.id AS invoice_id,
  CASE WHEN invoice.id IS NOT NULL THEN invoice.document_status
    WHEN permission.invoice_scope = 'organization' THEN 'missing'
    ELSE NULL END::text AS invoice_document_status,
  CASE
    WHEN NOT voucher.exists_for_caller AND permission.document_scope IS DISTINCT FROM 'organization' THEN NULL
    WHEN b.status IN ('cancelled', 'canceled') OR b.workflow_stage = 'cancelled' THEN
      CASE WHEN voucher.exists_for_caller THEN 'archived' ELSE 'cancelled' END
    WHEN b.status NOT IN ('confirmed', 'completed', 'paid') OR b.status IS NULL THEN 'awaiting_confirmation'
    WHEN voucher.exists_for_caller THEN 'issued'
    ELSE 'missing'
  END::text AS voucher_document_status
FROM public.bookings b
CROSS JOIN LATERAL (
  SELECT
    (SELECT p.data_scope FROM public._org_permission_state(b.organization_id, auth.uid(), 'financial_view') p WHERE p.granted) AS finance_scope,
    (SELECT p.data_scope FROM public._org_permission_state(b.organization_id, auth.uid(), 'invoices_view') p WHERE p.granted) AS invoice_scope,
    (SELECT p.data_scope FROM public._org_permission_state(b.organization_id, auth.uid(), 'documents_view') p WHERE p.granted) AS document_scope
) permission
LEFT JOIN LATERAL (
  SELECT
    i.id,
    CASE WHEN lower(coalesce(i.status, 'draft')) = 'draft' THEN 'draft'
      WHEN lower(i.status) IN ('cancelled', 'canceled', 'void') THEN 'archived'
      ELSE 'issued' END AS document_status
  FROM public.invoices i
  WHERE i.booking_id = b.id AND i.organization_id = b.organization_id
    AND coalesce(i.is_demo, false) = coalesce(b.is_demo, false)
    AND (permission.invoice_scope = 'organization'
      OR (permission.invoice_scope = 'own' AND i.created_by = auth.uid()))
  ORDER BY CASE
    WHEN lower(coalesce(i.status, 'draft')) = 'draft' THEN 1
    WHEN lower(i.status) IN ('cancelled', 'canceled', 'void') THEN 2 ELSE 0 END,
    i.issued_date DESC NULLS LAST, i.created_at DESC NULLS LAST, i.id DESC
  LIMIT 1
) invoice ON true
LEFT JOIN LATERAL (
  SELECT
    sum(coalesce(i.total_paid_amount, 0)) AS paid_amount,
    sum(greatest(coalesce(i.remaining_amount, coalesce(i.final_amount, 0) - coalesce(i.total_paid_amount, 0)), 0)) AS remaining_amount
  FROM public.invoices i
  WHERE i.booking_id = b.id AND i.organization_id = b.organization_id
    AND coalesce(i.is_demo, false) = coalesce(b.is_demo, false)
    AND lower(coalesce(i.status, 'draft')) NOT IN ('draft', 'cancelled', 'canceled', 'void')
    AND upper(coalesce(nullif(i.currency, ''), nullif(b.currency, ''), 'EGP')) = upper(coalesce(nullif(b.currency, ''), 'EGP'))
    AND (permission.finance_scope = 'organization'
      OR (permission.finance_scope = 'own' AND i.created_by = auth.uid()))
    AND (permission.invoice_scope = 'organization'
      OR (permission.invoice_scope = 'own' AND i.created_by = auth.uid()))
) totals ON true
CROSS JOIN LATERAL (
  SELECT
    (coalesce(permission.document_scope = 'organization', false) AND EXISTS (
      SELECT 1 FROM public.booking_vouchers v
      WHERE v.booking_id = b.id AND v.organization_id = b.organization_id
    )) OR EXISTS (
      SELECT 1 FROM public.generated_documents d
      WHERE d.booking_id = b.id AND d.organization_id = b.organization_id AND d.document_type = 'voucher'
        AND (permission.document_scope = 'organization'
          OR (permission.document_scope = 'own' AND d.created_by = auth.uid()))
    ) AS exists_for_caller
) voucher
WHERE b.booking_type IN ('hotel', 'flight', 'transport', 'car', 'car_rental')
  AND auth.uid() IS NOT NULL
  AND public.has_org_permission(b.organization_id, 'bookings_view');

REVOKE ALL ON public.specialized_booking_finance_facts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.specialized_booking_finance_facts TO authenticated;

-- ============ HOTEL ============
CREATE OR REPLACE VIEW public.hotel_bookings_unified
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.organization_id,
  b.customer_id,
  b.customer_name,
  b.employee_id,
  b.supplier_id,
  b.supplier_name,
  b.status_id,
  b.currency,
  b.selling_price                         AS total_cost_customer,
  b.cost_price                            AS total_cost_supplier,
  b.profit                                AS total_profit,
  b.booking_number                        AS internal_booking_number,
  b.notes                                 AS internal_notes,
  b.created_at,
  b.updated_at,
  COALESCE(h.hotel_name, '')              AS hotel_name,
  h.star_rating                           AS hotel_star_rating,
  h.city                                  AS destination_city,
  COALESCE(h.check_in,  b.start_date)     AS check_in_date,
  COALESCE(h.check_out, b.end_date)       AS check_out_date,
  COALESCE(h.nights, GREATEST(1, (COALESCE(h.check_out, b.end_date) - COALESCE(h.check_in, b.start_date)))) AS number_of_nights,
  COALESCE(h.rooms, 1)                    AS number_of_rooms,
  COALESCE(h.room_type, '')               AS room_type,
  COALESCE(h.adults, 0)                   AS number_of_adults,
  COALESCE(h.children, 0)                 AS number_of_children,
  h.children_ages,
  COALESCE(h.meal_plan, h.board_type, 'RO') AS meal_plan,
  h.cancellation_policy,
  h.booking_reference                     AS booking_reference_supplier,
  COALESCE(h.selling_per_night, COALESCE(h.selling_amount, b.selling_price) /
    (GREATEST(COALESCE(h.nights, 1), 1) * GREATEST(COALESCE(h.rooms, 1), 1))) AS selling_price_per_night,
  COALESCE(h.cost_per_night, COALESCE(h.cost_amount, b.cost_price) /
    (GREATEST(COALESCE(h.nights, 1), 1) * GREATEST(COALESCE(h.rooms, 1), 1))) AS cost_per_night,
  facts.paid_amount                         AS paid_amount,
  facts.remaining_amount                    AS remaining_amount,
  false                                   AS invoice_sent,
  false                                   AS voucher_sent,
  false                                   AS supplier_payment_sent,
  NULL::timestamptz                       AS invoice_sent_date,
  NULL::timestamptz                       AS voucher_sent_date,
  NULL::timestamptz                       AS supplier_payment_sent_date,
  b.created_at::date                      AS booking_date,
  ''::text                                AS booking_agent_name,
  facts.invoice_id, facts.invoice_document_status, facts.voucher_document_status,
  b.status::text AS booking_status_code
FROM public.bookings b
LEFT JOIN public.specialized_booking_finance_facts facts
  ON facts.id = b.id AND facts.organization_id = b.organization_id
LEFT JOIN public.booking_hotel_details h ON h.booking_id = b.id
WHERE b.booking_type = 'hotel';

GRANT SELECT ON public.hotel_bookings_unified TO authenticated;

-- ============ FLIGHT ============
CREATE OR REPLACE VIEW public.flight_bookings_unified
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.organization_id,
  b.customer_id,
  b.customer_name,
  b.employee_id,
  b.supplier_id,
  b.supplier_name,
  b.status_id,
  b.currency,
  b.selling_price                         AS total_cost,
  b.cost_price                            AS supplier_cost,
  b.profit                                AS total_profit,
  b.booking_number                        AS booking_reference,
  b.notes                                 AS special_requests,
  b.created_at,
  b.updated_at,
  f.airline                               AS airline_name,
  f.flight_number,
  f.flight_class                          AS flight_class_name,
  f.departure_airport                     AS departure_airport_code,
  f.arrival_airport                       AS arrival_airport_code,
  COALESCE(f.departure_date, b.start_date) AS departure_date,
  f.departure_time,
  COALESCE(f.arrival_date,   b.end_date)   AS arrival_date,
  f.arrival_time,
  f.ticket_number,
  f.pnr                                   AS confirmation_number,
  COALESCE(f.passengers_count, 1)         AS number_of_passengers,
  f.ticket_price_per_person,
  f.taxes_and_fees,
  f.is_round_trip,
  f.seat_preferences,
  f.meal_preferences,
  facts.paid_amount                         AS paid_amount,
  facts.remaining_amount                    AS remaining_amount,
  false                                   AS invoice_sent,
  false                                   AS voucher_sent,
  false                                   AS supplier_payment_sent,
  ''::text                                AS booking_agent_name,
  facts.invoice_id, facts.invoice_document_status, facts.voucher_document_status,
  b.status::text AS booking_status_code
FROM public.bookings b
LEFT JOIN public.specialized_booking_finance_facts facts
  ON facts.id = b.id AND facts.organization_id = b.organization_id
LEFT JOIN public.booking_flight_details f ON f.booking_id = b.id
WHERE b.booking_type = 'flight';

GRANT SELECT ON public.flight_bookings_unified TO authenticated;

-- ============ TRANSPORT ============
CREATE OR REPLACE VIEW public.transport_bookings_unified
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.organization_id,
  b.customer_id,
  b.customer_name,
  b.employee_id,
  b.supplier_id,
  b.supplier_name,
  b.status_id,
  b.currency,
  b.selling_price                         AS total_cost,
  b.cost_price                            AS supplier_cost,
  b.profit                                AS total_profit,
  b.booking_number                        AS booking_reference,
  b.notes                                 AS special_requests,
  b.created_at,
  b.updated_at,
  t.vehicle_type                          AS vehicle_type_name,
  t.route                                 AS route_name,
  t.pickup_point                          AS pickup_location,
  t.dropoff_point                         AS dropoff_location,
  COALESCE(t.passengers, 1)               AS number_of_passengers,
  COALESCE(b.start_date, b.created_at::date) AS departure_date,
  t.pickup_time::text                     AS departure_time,
  NULL::text                              AS driver_name,
  NULL::text                              AS driver_phone,
  NULL::text                              AS vehicle_plate_number,
  facts.paid_amount                         AS paid_amount,
  facts.remaining_amount                    AS remaining_amount,
  false                                   AS invoice_sent,
  false                                   AS voucher_sent,
  false                                   AS supplier_payment_sent,
  NULL::timestamptz                       AS invoice_sent_date,
  NULL::timestamptz                       AS voucher_sent_date,
  NULL::timestamptz                       AS supplier_payment_sent_date,
  facts.invoice_id, facts.invoice_document_status, facts.voucher_document_status,
  b.status::text AS booking_status_code
FROM public.bookings b
LEFT JOIN public.specialized_booking_finance_facts facts
  ON facts.id = b.id AND facts.organization_id = b.organization_id
LEFT JOIN public.booking_transport_details t ON t.booking_id = b.id
WHERE b.booking_type = 'transport';

GRANT SELECT ON public.transport_bookings_unified TO authenticated;

-- ============ CAR RENTAL ============
CREATE OR REPLACE VIEW public.car_rentals_unified
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.organization_id,
  b.customer_id,
  b.customer_name,
  b.employee_id,
  b.supplier_id,
  b.supplier_name,
  b.status_id,
  b.currency,
  b.selling_price                         AS total_rental_cost,
  b.cost_price                            AS supplier_total_cost,
  b.profit                                AS total_profit,
  b.booking_number                        AS rental_reference,
  b.notes                                 AS special_requirements,
  b.created_at,
  b.updated_at,
  c.car_type                              AS vehicle_type_name,
  c.pickup_location,
  c.dropoff_location                      AS return_location,
  COALESCE(c.pickup_date, b.start_date)   AS rental_start_date,
  COALESCE(c.dropoff_date, b.end_date)    AS rental_end_date,
  GREATEST(1, (COALESCE(c.dropoff_date, b.end_date) - COALESCE(c.pickup_date, b.start_date))) AS rental_duration_days,
  c.daily_rate,
  COALESCE(c.insurance_included, false)   AS insurance_included,
  facts.paid_amount                         AS paid_amount,
  facts.remaining_amount                    AS remaining_amount,
  false                                   AS invoice_sent,
  false                                   AS supplier_payment_sent,
  facts.invoice_id, facts.invoice_document_status, facts.voucher_document_status,
  b.status::text AS booking_status_code
FROM public.bookings b
LEFT JOIN public.specialized_booking_finance_facts facts
  ON facts.id = b.id AND facts.organization_id = b.organization_id
LEFT JOIN public.booking_car_details c ON c.booking_id = b.id
WHERE b.booking_type IN ('car_rental', 'car');

GRANT SELECT ON public.car_rentals_unified TO authenticated;
