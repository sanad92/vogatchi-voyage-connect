
-- Email queue table for transactional emails
CREATE TABLE public.email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  email_type TEXT NOT NULL, -- 'welcome', 'booking_confirmation', 'invoice', 'subscription_activated', 'subscription_expiring', 'subscription_expired'
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON public.email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_email_queue_org ON public.email_queue(organization_id);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Org members can view their own email queue
CREATE POLICY "Org members can view email_queue"
ON public.email_queue FOR SELECT
USING (organization_id = ANY (get_user_org_ids(auth.uid())));

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role can manage email_queue"
ON public.email_queue FOR ALL
USING (true)
WITH CHECK (true);

-- Make service role policy only for service role
DROP POLICY "Service role can manage email_queue" ON public.email_queue;

CREATE POLICY "Service role full access email_queue"
ON public.email_queue FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Org members can insert to queue
CREATE POLICY "Org members can insert email_queue"
ON public.email_queue FOR INSERT
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())));

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
