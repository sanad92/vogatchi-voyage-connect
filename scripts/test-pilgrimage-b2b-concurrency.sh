#!/usr/bin/env bash
# Disposable PostgreSQL 16 only; run after test-pilgrimage-b2b-agreements.sql.
# Race internal contract approval against an attempted seat release.
# No Lovable, live database, payment or external provider calls.
set -euo pipefail

psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q <<'SQL'
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,
 name,program_id,buyer_agency_id,party_size,currency
) VALUES(
 '00000000-0000-4000-8000-000000000310',
 '00000000-0000-4000-8000-000000000001',
 'umrah','b2b_group','organizer','Concurrent agency contract',
 '00000000-0000-4000-8000-000000000201',
 '00000000-0000-4000-8000-000000000401',1,'EGP'
);
INSERT INTO public.pilgrimage_sale_items(
 organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell
) VALUES(
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000310',
 'program_seat','One extra wholesale place','quad',1,800
);
UPDATE public.pilgrimage_sales SET status='quoted'
 WHERE id='00000000-0000-4000-8000-000000000310';
SELECT public.transition_pilgrimage_seat_allocation(
 '00000000-0000-4000-8000-000000000310','hold',120);
SELECT public.transition_pilgrimage_seat_allocation(
 '00000000-0000-4000-8000-000000000310','allocate',120);
SELECT public.prepare_pilgrimage_b2b_agreement(
 '00000000-0000-4000-8000-000000000310',
 '00000000-0000-4000-8000-000000000101',
 'This agency has one more internally allocated group place',
 '[{"due_date":"2027-02-01","amount":800}]'::jsonb
);
SQL

PGAPPNAME=b2b_agreement_approver_a psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q > /tmp/pilgrimage-b2b-approver-a.log 2>&1 <<'SQL' &
BEGIN;
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
SELECT public.approve_pilgrimage_b2b_agreement(
  (SELECT id FROM public.pilgrimage_b2b_agreements
   WHERE sale_id='00000000-0000-4000-8000-000000000310'));
SELECT pg_sleep(4);
COMMIT;
SQL
writer_pid=$!

ready=0
for attempt in $(seq 1 60); do
  state="$(psql -h localhost -U postgres -d postgres -X -qAt -v ON_ERROR_STOP=1 -c "
    SELECT count(*) FROM pg_stat_activity
    WHERE application_name='b2b_agreement_approver_a'
      AND state='active' AND query LIKE 'SELECT pg_sleep%';")"
  if [[ "$state" == "1" ]]; then ready=1; break; fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  cat /tmp/pilgrimage-b2b-approver-a.log
  wait "$writer_pid" || true
  echo 'B2B internal approval never reached open-transaction lock barrier' >&2
  exit 1
fi

PGAPPNAME=b2b_agreement_releaser_b psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q <<'SQL'
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000310','release',120);
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN
  RAISE EXCEPTION 'Release won concurrent approval and voided contracted inventory';
 END IF;
END $$;
SQL
wait "$writer_pid"

psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -qAt <<'SQL'
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.pilgrimage_b2b_agreements b
  JOIN public.pilgrimage_seat_allocations a ON a.sale_id=b.sale_id
  WHERE b.sale_id='00000000-0000-4000-8000-000000000310'
    AND b.status='approved_internal' AND a.status='allocated')
 THEN RAISE EXCEPTION 'Approved B2B agreement lost its inventory after racing release'; END IF;
END $$;
SQL
echo 'B2B agreement approval vs concurrent seat release: SERIALIZED and SAFE.'
