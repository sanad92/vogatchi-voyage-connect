
-- Error logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  error_type TEXT NOT NULL DEFAULT 'client',
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT,
  url TEXT,
  user_id UUID,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_org ON public.error_logs(organization_id);
CREATE INDEX idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved) WHERE resolved = false;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admin can view all error_logs"
ON public.error_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Org admins can view own error_logs"
ON public.error_logs FOR SELECT
TO authenticated
USING (organization_id = ANY (get_user_org_ids(auth.uid())));

CREATE POLICY "Authenticated can insert error_logs"
ON public.error_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service role full access error_logs"
ON public.error_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Performance logs table
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  page_url TEXT NOT NULL,
  load_time_ms INTEGER,
  ttfb_ms INTEGER,
  fcp_ms INTEGER,
  lcp_ms INTEGER,
  cls NUMERIC,
  fid_ms INTEGER,
  user_id UUID,
  user_agent TEXT,
  connection_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_perf_logs_org ON public.performance_logs(organization_id);
CREATE INDEX idx_perf_logs_created ON public.performance_logs(created_at DESC);

ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view performance_logs"
ON public.performance_logs FOR SELECT
TO authenticated
USING (organization_id = ANY (get_user_org_ids(auth.uid())));

CREATE POLICY "Platform admin can view all performance_logs"
ON public.performance_logs FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated can insert performance_logs"
ON public.performance_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service role full access performance_logs"
ON public.performance_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- API request logs table
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  function_name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  status_code INTEGER,
  response_time_ms INTEGER,
  request_body JSONB,
  response_summary TEXT,
  user_id UUID,
  ip_address TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_logs_org ON public.api_logs(organization_id);
CREATE INDEX idx_api_logs_created ON public.api_logs(created_at DESC);
CREATE INDEX idx_api_logs_function ON public.api_logs(function_name);
CREATE INDEX idx_api_logs_status ON public.api_logs(status_code);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view api_logs"
ON public.api_logs FOR SELECT
TO authenticated
USING (organization_id = ANY (get_user_org_ids(auth.uid())));

CREATE POLICY "Platform admin can view all api_logs"
ON public.api_logs FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access api_logs"
ON public.api_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Org admins can update error_logs (resolve)
CREATE POLICY "Org admins can update error_logs"
ON public.error_logs FOR UPDATE
TO authenticated
USING (organization_id = ANY (get_user_org_ids(auth.uid())));
