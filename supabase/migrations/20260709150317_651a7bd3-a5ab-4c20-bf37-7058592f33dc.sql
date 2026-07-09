
CREATE TABLE public.whatsapp_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  message_body TEXT,
  audience_type TEXT NOT NULL DEFAULT 'all' CHECK (audience_type IN ('all','segment','tag','custom','manual')),
  audience_filter JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','completed','failed','cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_broadcasts TO authenticated;
GRANT ALL ON public.whatsapp_broadcasts TO service_role;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read broadcasts" ON public.whatsapp_broadcasts FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org members insert broadcasts" ON public.whatsapp_broadcasts FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org members update broadcasts" ON public.whatsapp_broadcasts FOR UPDATE TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org members delete broadcasts" ON public.whatsapp_broadcasts FOR DELETE TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX idx_whatsapp_broadcasts_org_status ON public.whatsapp_broadcasts(organization_id, status);
CREATE INDEX idx_whatsapp_broadcasts_scheduled ON public.whatsapp_broadcasts(scheduled_at) WHERE status = 'scheduled';

CREATE TABLE public.whatsapp_broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES public.whatsapp_broadcasts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed','skipped')),
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  personalization JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_broadcast_recipients TO authenticated;
GRANT ALL ON public.whatsapp_broadcast_recipients TO service_role;
ALTER TABLE public.whatsapp_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read recipients" ON public.whatsapp_broadcast_recipients FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org members insert recipients" ON public.whatsapp_broadcast_recipients FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org members update recipients" ON public.whatsapp_broadcast_recipients FOR UPDATE TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org members delete recipients" ON public.whatsapp_broadcast_recipients FOR DELETE TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX idx_broadcast_recipients_broadcast ON public.whatsapp_broadcast_recipients(broadcast_id, status);
CREATE INDEX idx_broadcast_recipients_org ON public.whatsapp_broadcast_recipients(organization_id);

CREATE TRIGGER trg_wa_broadcasts_updated BEFORE UPDATE ON public.whatsapp_broadcasts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wa_broadcast_recipients_updated BEFORE UPDATE ON public.whatsapp_broadcast_recipients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_broadcast_recipients;
