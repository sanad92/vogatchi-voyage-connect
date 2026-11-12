#!/usr/bin/env bash
# Run after scripts/test-pilgrimage-retail-registration.sql, on disposable CI.
# Two real PostgreSQL clients race a quote-to-pilgrims conversion against
# another buyer attempting to hold the same internal program capacity.
set -euo pipefail

psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO public.pilgrimage_programs(
 id,organization_id,name,program_type,capacity,price_double,status,currency
) VALUES(
 '00000000-0000-4000-8000-000000000220',
 '00000000-0000-4000-8000-000000000001',
 'Atomic Race Program','umrah',2,1800,'open','EGP');
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,name,
 program_id,buyer_customer_id,party_size,currency
) VALUES
 ('00000000-0000-4000-8000-000000000420',
  '00000000-0000-4000-8000-000000000001','umrah',
  'group_seat','organizer','Retail double party',
  '00000000-0000-4000-8000-000000000220',
  '00000000-0000-4000-8000-000000000101',2,'EGP'),
 ('00000000-0000-4000-8000-000000000421',
  '00000000-0000-4000-8000-000000000001','umrah',
  'group_seat','organizer','Competing retail party',
  '00000000-0000-4000-8000-000000000220',
  '00000000-0000-4000-8000-000000000101',1,'EGP');
INSERT INTO public.pilgrimage_sale_items(
 organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell
) VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000420',
  'program_seat','Double pair','double',2,1800),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000421',
  'program_seat','Competing seat','double',1,1800);
INSERT INTO public.pilgrimage_sale_travelers(
 organization_id,sale_id,display_name,room_type
) VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000420',
  'Alpha Test Passenger','double'),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000420',
  'Beta Test Passenger','double');
UPDATE public.pilgrimage_sales SET status='quoted'
 WHERE id IN ('00000000-0000-4000-8000-000000000420',
              '00000000-0000-4000-8000-000000000421');
SELECT public.transition_pilgrimage_seat_allocation(
 '00000000-0000-4000-8000-000000000420','hold',120);
SELECT public.transition_pilgrimage_seat_allocation(
 '00000000-0000-4000-8000-000000000420','allocate',120);
SQL

# A holds the program row lock after transforming its allocation into
# genuine pilgrim rows, before committing the transfer.
PGAPPNAME=pilgrimage_conversion_writer_a psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q >/tmp/pilgrimage-conversion-writer-a.log 2>&1 <<'SQL' &
BEGIN;
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
SELECT public.convert_pilgrimage_retail_group(
 '00000000-0000-4000-8000-000000000420');
SELECT pg_sleep(4);
COMMIT;
SQL
writer_pid=$!

ready=0
for attempt in $(seq 1 60); do
  state="$(psql -h localhost -U postgres -d postgres -X -qAt -v ON_ERROR_STOP=1 -c "
    SELECT count(*) FROM pg_stat_activity
    WHERE application_name='pilgrimage_conversion_writer_a'
      AND state='active' AND query LIKE 'SELECT pg_sleep%';")"
  if [[ "$state" == "1" ]]; then ready=1; break; fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  cat /tmp/pilgrimage-conversion-writer-a.log
  wait "$writer_pid" || true
  echo 'Atomic registration writer missed the program-lock barrier' >&2
  exit 1
fi

# B must wait until A commits. Only then does it re-count actual pilgrims,
# and it must refuse a new hold with zero free seats.
PGAPPNAME=pilgrimage_conversion_writer_b psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q <<'SQL'
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000421','hold',60);
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN
  RAISE EXCEPTION 'Concurrent conversion overbooked the last program seat';
 END IF;
END $$;
SQL
wait "$writer_pid"

psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -qAt <<'SQL'
DO $$
BEGIN
 IF (SELECT count(*) FROM public.pilgrims
  WHERE program_id='00000000-0000-4000-8000-000000000220'
    AND status<>'cancelled')<>2
 OR (SELECT count(*) FROM public.pilgrimage_retail_conversion_travelers r
     JOIN public.pilgrimage_retail_conversions c ON c.id=r.conversion_id
     WHERE c.sale_id='00000000-0000-4000-8000-000000000420')<>2
 OR EXISTS(SELECT 1 FROM public.pilgrimage_seat_allocations
   WHERE program_id='00000000-0000-4000-8000-000000000220'
     AND (status='allocated' OR
          (status='held' AND hold_expires_at>now())))
 THEN RAISE EXCEPTION 'Competing conversion/hold left duplicated capacity'; END IF;
END $$;
SQL
echo 'Atomic group registration vs competing hold: SERIALIZED and NOT OVERBOOKED.'
