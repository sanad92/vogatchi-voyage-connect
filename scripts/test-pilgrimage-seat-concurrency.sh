#!/usr/bin/env bash
# PostgreSQL container-only concurrent seat-holder regression.
# Run AFTER scripts/test-pilgrimage-seat-allocations.sql. Never run hosted.
set -euo pipefail
psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q -c "
 UPDATE public.pilgrimage_programs SET capacity=11
 WHERE id='00000000-0000-4000-8000-000000000201';"

# Session A locks the program and creates a 10-seat B2B hold. It keeps
# its transaction open while session B competes for the last seats.
PGAPPNAME=pilgrimage_hold_writer_a psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q > /tmp/pilgrimage-concurrent-a.log 2>&1 <<'SQL' &
BEGIN;
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
SELECT public.transition_pilgrimage_seat_allocation(
 '00000000-0000-4000-8000-000000000303','hold',60);
SELECT pg_sleep(4);
COMMIT;
SQL
writer_pid=$!

# Poll until A is inside pg_sleep; at this point the hold succeeded
# and the program row lock remains retained in an open transaction.
ready=0
for attempt in $(seq 1 60); do
  state="$(psql -h localhost -U postgres -d postgres -X -qAt -v ON_ERROR_STOP=1 -c "
    SELECT count(*) FROM pg_stat_activity
    WHERE application_name='pilgrimage_hold_writer_a'
      AND state='active' AND query LIKE 'SELECT pg_sleep%';")"
  if [[ "$state" == "1" ]]; then ready=1; break; fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  cat /tmp/pilgrimage-concurrent-a.log
  wait "$writer_pid" || true
  echo 'Concurrent writer did not reach the lock-holding barrier' >&2
  exit 1
fi

# B may have a previously issued quote, but cannot claim two more seats:
# 1 registered + 10 held by A = 11/11.
PGAPPNAME=pilgrimage_hold_writer_b psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -q <<'SQL'
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
DO $$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    PERFORM public.transition_pilgrimage_seat_allocation(
      '00000000-0000-4000-8000-000000000306','hold',60);
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Concurrent sessions overbooked one program'; END IF;
END $$;
SQL

wait "$writer_pid"
psql -h localhost -U postgres -d postgres -X -v ON_ERROR_STOP=1 -qAt <<'SQL'
DO $$
BEGIN
 IF (SELECT coalesce(sum(a.seat_count),0)
   FROM public.pilgrimage_seat_allocations a
   WHERE a.program_id='00000000-0000-4000-8000-000000000201'
     AND (a.status='allocated' OR
       (a.status='held' AND a.hold_expires_at>now())))<>10
 THEN RAISE EXCEPTION 'Wrong committed inventory after competing transactions'; END IF;
END $$;
SQL
echo 'Two-session serial inventory limit passed without double booking.'
