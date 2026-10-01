CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'custom' CHECK (provider IN ('gmail','outlook','custom')),
  email_address text NOT NULL,
  display_name text,
  imap_host text NOT NULL, imap_port int NOT NULL DEFAULT 993,
  smtp_host text NOT NULL, smtp_port int NOT NULL DEFAULT 465,
  username text NOT NULL,
  password_ciphertext text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_uid bigint NOT NULL DEFAULT 0,
  uid_validity bigint,
  last_synced_at timestamptz,
  sync_error text,
  sync_locked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email_address)
);
GRANT ALL ON public.email_accounts TO service_role;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

CREATE VIEW public.email_accounts_public WITH (security_invoker = on) AS
  SELECT id, organization_id, provider, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, username, is_active, last_synced_at, sync_error, created_at
  FROM public.email_accounts;
GRANT SELECT ON public.email_accounts_public TO authenticated;
GRANT SELECT (id, organization_id, provider, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, username, is_active, last_synced_at, sync_error, created_at) ON public.email_accounts TO authenticated;
GRANT UPDATE (is_active, display_name) ON public.email_accounts TO authenticated;
GRANT DELETE ON public.email_accounts TO authenticated;
CREATE POLICY "members view email accounts" ON public.email_accounts FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "admins manage email accounts" ON public.email_accounts FOR UPDATE TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "admins delete email accounts" ON public.email_accounts FOR DELETE TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE TABLE public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  subject text,
  contact_email text NOT NULL,
  contact_name text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to uuid,
  assigned_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_at timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_inbound_at timestamptz,
  last_read_at timestamptz,
  marked_unread boolean NOT NULL DEFAULT false,
  snippet text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_threads_org_last ON public.email_threads (organization_id, last_message_at DESC);
GRANT SELECT ON public.email_threads TO authenticated;
GRANT UPDATE (last_read_at, marked_unread, customer_id, status, closed_at) ON public.email_threads TO authenticated;
GRANT ALL ON public.email_threads TO service_role;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_see_email_thread(_org uuid, _assigned uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.user_belongs_to_org(auth.uid(), _org) AND (
    _assigned IS NULL OR _assigned = auth.uid()
    OR public.get_user_org_role(auth.uid(), _org) IN ('owner','admin','manager'))
$$;
CREATE POLICY "view email threads" ON public.email_threads FOR SELECT TO authenticated
  USING (public.can_see_email_thread(organization_id, assigned_to));
CREATE POLICY "owner updates email thread" ON public.email_threads FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND (assigned_to = auth.uid() OR public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager')))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TABLE public.email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  in_reply_to text,
  references_header text,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_email text, from_name text,
  to_emails text[] NOT NULL DEFAULT '{}',
  cc_emails text[] NOT NULL DEFAULT '{}',
  subject text,
  body_text text,
  body_html text,
  imap_uid bigint,
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, message_id)
);
CREATE INDEX idx_email_messages_thread ON public.email_messages (thread_id, sent_at);
GRANT SELECT ON public.email_messages TO authenticated;
GRANT ALL ON public.email_messages TO service_role;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view email messages" ON public.email_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.email_threads t WHERE t.id = thread_id AND public.can_see_email_thread(t.organization_id, t.assigned_to)));

CREATE TABLE public.email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL, mime_type text, size_bytes int, storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_attachments TO authenticated;
GRANT ALL ON public.email_attachments TO service_role;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view email attachments" ON public.email_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.email_messages m JOIN public.email_threads t ON t.id = m.thread_id WHERE m.id = email_attachments.message_id AND public.can_see_email_thread(t.organization_id, t.assigned_to)));

CREATE OR REPLACE FUNCTION public.claim_email_thread(_thread uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.email_threads WHERE id = _thread FOR UPDATE;
  IF NOT FOUND OR NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'not found'; END IF;
  IF r.assigned_to IS NOT NULL AND r.assigned_to <> auth.uid() THEN RAISE EXCEPTION 'already claimed'; END IF;
  UPDATE public.email_threads SET assigned_to = auth.uid(), assigned_at = now(), status = 'open', closed_at = NULL, updated_at = now() WHERE id = _thread;
END $$;

CREATE OR REPLACE FUNCTION public.release_email_thread(_thread uuid, _close boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.email_threads WHERE id = _thread FOR UPDATE;
  IF NOT FOUND OR NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'not found'; END IF;
  IF r.assigned_to IS DISTINCT FROM auth.uid() AND public.get_user_org_role(auth.uid(), r.organization_id) NOT IN ('owner','admin','manager') THEN RAISE EXCEPTION 'not owner'; END IF;
  UPDATE public.email_threads SET assigned_to = NULL, assigned_at = NULL,
    status = CASE WHEN _close THEN 'closed' ELSE 'open' END,
    closed_at = CASE WHEN _close THEN now() ELSE NULL END, updated_at = now() WHERE id = _thread;
END $$;
REVOKE ALL ON FUNCTION public.claim_email_thread(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_email_thread(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_email_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_email_thread(uuid, boolean) TO authenticated;

CREATE TRIGGER trg_email_accounts_updated BEFORE UPDATE ON public.email_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_email_threads_updated BEFORE UPDATE ON public.email_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.email_threads;