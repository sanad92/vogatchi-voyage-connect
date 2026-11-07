-- Safar Flow V1: harden and reuse the existing quote_followups runtime.
-- Staged for TEST database deployment only. Does not schedule a cron job.
-- Run AFTER the 2026-09-28 quote_followups migrations.
-- This function creates IN-APP staff notifications only: no WhatsApp, email, billing or bookings.

BEGIN;

-- Existing trigger originally covered UPDATE only. Quotes imported as 'sent' on
-- initial INSERT need the same follow-up schedule.
CREATE OR REPLACE FUNCTION public._trg_quote_followups()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  ph text;
  reminder_days integer[];
  should_schedule boolean := false;
BEGIN
  IF NEW.status = 'sent' THEN
    IF TG_OP = 'INSERT' THEN
      should_schedule := true;
    ELSIF OLD.status IS DISTINCT FROM 'sent' THEN
      should_schedule := true;
    END IF;
  END IF;

  IF should_schedule THEN
    SELECT public._digits(c.phone) INTO ph
      FROM public.customers c
      WHERE c.id = NEW.customer_id AND c.organization_id = NEW.organization_id;
    SELECT os.quote_followup_days INTO reminder_days
      FROM public.organization_settings os
      WHERE os.organization_id = NEW.organization_id;
    reminder_days := COALESCE(reminder_days, ARRAY[1,3,7]);
    INSERT INTO public.quote_followups(
      organization_id, quote_id, customer_id, phone, owner_user_id, step, due_at
    )
    SELECT NEW.organization_id, NEW.id, NEW.customer_id, ph,
           COALESCE(auth.uid(), NEW.created_by), s.ord::smallint,
           now() + make_interval(days => s.d)
    FROM unnest(reminder_days) WITH ORDINALITY AS s(d, ord)
    ON CONFLICT (quote_id, step) DO NOTHING;
  ELSIF TG_OP = 'UPDATE'
        AND NEW.status IN ('accepted','rejected','expired','converted','cancelled')
        AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.quote_followups f
    SET status = 'cancelled'
    WHERE f.quote_id = NEW.id
      AND f.organization_id = NEW.organization_id
      AND f.status IN ('pending','notified');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._trg_quote_followups() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS quote_followups_schedule ON public.quotes;
CREATE TRIGGER quote_followups_schedule
  AFTER INSERT OR UPDATE OF status ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public._trg_quote_followups();

-- Process only follow-ups that are still actionable. FOR UPDATE SKIP LOCKED
-- prevents two overlapping cron runs from notifying the same row.
-- Existing quote_followups (quote_id, step) uniqueness controls scheduling.
CREATE OR REPLACE FUNCTION public.dispatch_quote_followups()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  n integer := 0;
BEGIN
  WITH eligible AS MATERIALIZED (
    SELECT f.id
    FROM public.quote_followups f
    JOIN public.quotes q
      ON q.id = f.quote_id AND q.organization_id = f.organization_id
    JOIN public.organization_members m
      ON m.organization_id = f.organization_id AND m.user_id = f.owner_user_id
    WHERE f.status = 'pending'
      AND f.due_at <= now()
      AND q.status = 'sent'
      AND (q.valid_until IS NULL OR q.valid_until >= CURRENT_DATE)
    ORDER BY f.due_at, f.id
    LIMIT 250
    FOR UPDATE OF f SKIP LOCKED
  ), claimed AS (
    UPDATE public.quote_followups f
    SET status = 'notified', notified_at = now()
    FROM eligible e
    WHERE f.id = e.id AND f.status = 'pending'
    RETURNING f.id, f.quote_id, f.organization_id, f.owner_user_id, f.step
  ), totals AS (
    SELECT f.quote_id, max(f.step) AS max_step
    FROM public.quote_followups f
    WHERE f.quote_id IN (SELECT c.quote_id FROM claimed c)
    GROUP BY f.quote_id
  ), notifications_created AS (
    INSERT INTO public.notifications(
      user_id, organization_id, title, message, type, priority, action_url, metadata
    )
    SELECT c.owner_user_id, c.organization_id,
      'تابع العميل على واتساب',
      'عرض السعر ' || q.quote_number || ' للعميل ' || COALESCE(q.customer_name, '')
        || ' — تذكير ' || c.step || ' من ' || t.max_step || ' بدون رد',
      'reminder',
      CASE WHEN c.step = t.max_step THEN 'high' ELSE 'normal' END,
      '/quotes/' || q.id::text,
      jsonb_build_object('quote_followup_id', c.id, 'quote_id', q.id, 'source', 'safar_flow')
    FROM claimed c
    JOIN public.quotes q ON q.id = c.quote_id AND q.organization_id = c.organization_id
    JOIN totals t ON t.quote_id = c.quote_id
    RETURNING 1
  )
  SELECT count(*) INTO n FROM notifications_created;
  RETURN n;
END;
$$;

-- Only the database scheduler / service role can dispatch; not normal clients.
REVOKE ALL ON FUNCTION public.dispatch_quote_followups() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_quote_followups() TO service_role;

CREATE INDEX IF NOT EXISTS idx_safar_flow_followups_org_status_due
  ON public.quote_followups(organization_id, status, due_at);

COMMIT;
