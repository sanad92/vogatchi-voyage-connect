-- #148: Persist ad referral and a recoverable intake job in the SAME transaction
-- as the inbound WhatsApp message, before acknowledging Meta's webhook.
-- No live customer data is backfilled; the feature is opt-in per inbox.

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS ad_referral_id text,
  ADD COLUMN IF NOT EXISTS ad_referral_name text;

ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT wa_ad_referral_id_format
  CHECK (ad_referral_id IS NULL OR ad_referral_id ~ '^[0-9]{1,32}$');

CREATE TABLE public.wa_ad_lead_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_settings_id uuid NOT NULL REFERENCES public.whatsapp_settings(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  provider_message_id text NOT NULL,
  ad_id text NOT NULL CHECK (ad_id ~ '^[0-9]{1,32}$'),
  contact_name text,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'retry', 'completed', 'skipped', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider_message_id),
  UNIQUE (message_id)
);
CREATE INDEX wa_ad_lead_jobs_due_idx ON public.wa_ad_lead_jobs (next_attempt_at, created_at)
  WHERE state IN ('pending', 'retry');
CREATE INDEX wa_ad_lead_jobs_org_status_idx ON public.wa_ad_lead_jobs (organization_id, state);

ALTER TABLE public.wa_ad_lead_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wa_ad_lead_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wa_ad_lead_jobs TO authenticated;
GRANT ALL ON public.wa_ad_lead_jobs TO service_role;
CREATE POLICY wa_ad_lead_jobs_read ON public.wa_ad_lead_jobs FOR SELECT TO authenticated
USING (
  coalesce(public.user_belongs_to_org(auth.uid(), organization_id), false)
  AND coalesce(public.has_org_permission(organization_id, 'whatsapp_view'), false)
);

CREATE FUNCTION public.wa_queue_ad_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- Even if an authenticated caller can insert a message, it cannot enqueue
  -- an ad referral: only the signature-verified webhook uses service_role.
  IF current_user <> 'service_role'
    OR NEW.direction <> 'inbound'
    OR NEW.message_id IS NULL
    OR NEW.ad_referral_id IS NULL
    OR NEW.ad_referral_id !~ '^[0-9]{1,32}$'
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wa_ad_lead_jobs (
    organization_id, whatsapp_settings_id, message_id, provider_message_id, ad_id, contact_name
  )
  SELECT NEW.organization_id, NEW.whatsapp_settings_id, NEW.id, NEW.message_id,
    NEW.ad_referral_id, left(nullif(btrim(NEW.ad_referral_name), ''), 120)
  FROM public.whatsapp_settings s
  WHERE s.id = NEW.whatsapp_settings_id
    AND s.organization_id = NEW.organization_id
    AND s.is_active IS TRUE
    AND s.auto_ad_leads IS TRUE
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.wa_queue_ad_referral() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER wa_enqueue_ad_referral
AFTER INSERT OR UPDATE OF ad_referral_id, ad_referral_name
ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.wa_queue_ad_referral();

-- Allow only the internal server role and the trusted pg_cron database owner
-- to replay the existing idempotent lead RPC. Keep the existing eligibility,
-- per-organization checks, conversation lock, and DO NOTHING on duplicates.
CREATE OR REPLACE FUNCTION public.wa_open_ad_lead(_org uuid, _message uuid, _ad text, _name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  chat public.whatsapp_conversations;
  lead_id uuid;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Internal only' USING ERRCODE = '42501';
  END IF;
  IF _ad IS NULL OR _ad !~ '^[0-9]{1,32}$' THEN RETURN NULL; END IF;

  SELECT c.* INTO chat FROM public.whatsapp_conversations c
  JOIN public.whatsapp_messages m ON m.conversation_id = c.id
    AND m.organization_id = c.organization_id AND m.whatsapp_settings_id = c.whatsapp_settings_id
  JOIN public.whatsapp_settings s ON s.id = c.whatsapp_settings_id AND s.organization_id = c.organization_id
  WHERE c.organization_id = _org AND m.id = _message AND m.direction = 'inbound'
    AND s.auto_ad_leads AND s.is_active IS TRUE
  FOR UPDATE OF c;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.sop_leads (
    organization_id, lead_number, conversation_id, customer_id, contact_name, contact_phone, lead_source, campaign
  ) VALUES (
    _org, 'LD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    chat.id, (SELECT id FROM public.customers WHERE id = chat.customer_id AND organization_id = _org),
    coalesce((SELECT name FROM public.customers WHERE id = chat.customer_id AND organization_id = _org),
      nullif(left(btrim(_name), 120), '')),
    chat.phone_number, 'whatsapp', 'إعلان واتساب #' || _ad
  )
  ON CONFLICT (organization_id, conversation_id) WHERE conversation_id IS NOT NULL DO NOTHING
  RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$$;
REVOKE ALL ON FUNCTION public.wa_open_ad_lead(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_open_ad_lead(uuid, uuid, text, text) TO service_role;

-- Keep processing in the database: pg_cron does not need to send webhook
-- payloads or a service key to an external URL. SKIP LOCKED prevents two
-- concurrent runs from selecting the same pending job.
CREATE FUNCTION public.wa_process_ad_lead_jobs(_batch integer DEFAULT 50)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  job public.wa_ad_lead_jobs;
  accepted integer := 0;
  lead_found boolean;
  linked_chat uuid;
  next_attempt integer;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Internal only' USING ERRCODE = '42501';
  END IF;

  FOR job IN
    SELECT * FROM public.wa_ad_lead_jobs
    WHERE state IN ('pending', 'retry') AND next_attempt_at <= now()
    ORDER BY next_attempt_at, created_at
    LIMIT least(greatest(coalesce(_batch, 50), 1), 100)
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      SELECT m.conversation_id INTO linked_chat
      FROM public.whatsapp_messages m
      WHERE m.id = job.message_id AND m.organization_id = job.organization_id
        AND m.whatsapp_settings_id = job.whatsapp_settings_id
        AND m.message_id = job.provider_message_id AND m.direction = 'inbound'
        AND m.ad_referral_id = job.ad_id;

      IF linked_chat IS NULL THEN
        UPDATE public.wa_ad_lead_jobs
          SET state = 'skipped', attempts = job.attempts + 1,
              last_error = 'Original message/referral is no longer eligible', updated_at = now()
        WHERE id = job.id;
      ELSE
        -- The RPC rechecks current inbox opt-in/activity and locks the chat.
        PERFORM public.wa_open_ad_lead(job.organization_id, job.message_id, job.ad_id, job.contact_name);
        SELECT EXISTS (
          SELECT 1 FROM public.sop_leads l
          WHERE l.organization_id = job.organization_id AND l.conversation_id = linked_chat
        ) INTO lead_found;
        UPDATE public.wa_ad_lead_jobs
          SET state = CASE WHEN lead_found THEN 'completed' ELSE 'skipped' END,
              attempts = job.attempts + 1,
              last_error = NULL, updated_at = now()
        WHERE id = job.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      next_attempt := job.attempts + 1;
      UPDATE public.wa_ad_lead_jobs
        SET state = CASE WHEN next_attempt >= 8 THEN 'failed' ELSE 'retry' END,
            attempts = next_attempt,
            next_attempt_at = now() + make_interval(mins => least(60, (2 ^ least(next_attempt, 6))::integer)),
            last_error = left(SQLERRM, 300), updated_at = now()
      WHERE id = job.id;
    END;
    accepted := accepted + 1;
  END LOOP;
  RETURN accepted;
END;
$$;
REVOKE ALL ON FUNCTION public.wa_process_ad_lead_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_process_ad_lead_jobs(integer) TO service_role;

-- The existing project uses pg_cron for DB event processing. Schedule the
-- retry worker with the same trusted database-owner model when installed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wa-ad-lead-recovery') THEN
      PERFORM cron.unschedule('wa-ad-lead-recovery');
    END IF;
    PERFORM cron.schedule('wa-ad-lead-recovery', '*/5 * * * *',
      $cron$SELECT public.wa_process_ad_lead_jobs(50);$cron$);
  END IF;
END
$$;
