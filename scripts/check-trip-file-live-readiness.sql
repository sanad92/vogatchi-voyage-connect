-- READ ONLY / safe to run against the Lovable Cloud production database.
-- Returns schema readiness flags only, not a single customer record.
-- Do not apply draft migrations without staged JWT/RLS and service QA.
WITH expected(kind, object_name) AS (
  VALUES
    ('table','bookings'),
    ('table','booking_timeline_events'),
    ('table','hotel_bookings'),
    ('table','organization_members'),
    ('table','quotes'),
    ('table','quote_items'),
    ('table','invoices'),
    ('table','supplier_invoices'),
    ('table','customer_payments'),
    ('table','supplier_payments'),
    ('table','generated_documents'),
    ('table','customer_payment_allocations'),
    ('table','supplier_payment_allocations'),
    ('table','booking_change_requests'),
    ('table','booking_change_handoffs'),
    ('table','booking_change_handoff_events'),
    ('table','booking_change_source_evidence'),
    ('table','quote_version_snapshots'),
    ('function','has_org_permission'),
    ('function','get_booking_profit_cockpit'),
    ('function','create_booking_change_request'),
    ('function','decide_booking_change_request'),
    ('function','record_booking_change_handoff'),
    ('function','link_booking_change_source_evidence'),
    ('function','capture_quote_version_snapshot')
)
SELECT expected.kind, expected.object_name,
  CASE expected.kind
    WHEN 'table' THEN EXISTS(
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema='public' AND t.table_name=expected.object_name
    )
    ELSE EXISTS(
      SELECT 1 FROM information_schema.routines r
      WHERE r.routine_schema='public' AND r.routine_name=expected.object_name
    )
  END AS installed
FROM expected
ORDER BY expected.kind, expected.object_name;
