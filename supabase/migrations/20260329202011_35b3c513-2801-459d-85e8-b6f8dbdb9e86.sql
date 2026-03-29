
-- Fix whatsapp_sessions: scope by employee ownership
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_sessions" ON public.whatsapp_sessions;
CREATE POLICY "Users manage own whatsapp_sessions" ON public.whatsapp_sessions
  FOR ALL TO authenticated
  USING (public.employee_org_match(employee_id))
  WITH CHECK (public.employee_org_match(employee_id));

-- Fix whatsapp_templates: restrict write to authenticated users only (no org_id available)
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "Authenticated users manage whatsapp_templates" ON public.whatsapp_templates
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix organizations INSERT
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix service_requests INSERT
DROP POLICY IF EXISTS "Anyone insert service_requests" ON public.service_requests;
CREATE POLICY "Authenticated insert service_requests" ON public.service_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
