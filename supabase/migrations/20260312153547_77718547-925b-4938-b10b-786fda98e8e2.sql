
-- 1. Fix organization_members: remove overly permissive self-insert policy
DROP POLICY IF EXISTS "Users can add themselves as org member" ON public.organization_members;

-- 2. Fix WhatsApp settings: restrict to authenticated only (no org_id column exists, single-tenant table)
-- The table has no organization_id, so we restrict to platform admins only since it contains API tokens
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_settings" ON public.whatsapp_settings;

CREATE POLICY "Platform admins can read whatsapp_settings"
ON public.whatsapp_settings
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert whatsapp_settings"
ON public.whatsapp_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update whatsapp_settings"
ON public.whatsapp_settings
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete whatsapp_settings"
ON public.whatsapp_settings
FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- 3. Fix invitations: remove public SELECT and add scoped policies
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.invitations;

CREATE POLICY "Users can read their own invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Org members can read org invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- 4. Fix payment_transactions: remove public insert, restrict to authenticated with org check
DROP POLICY IF EXISTS "Service role can insert payment transactions" ON public.payment_transactions;

CREATE POLICY "Authenticated users can insert payment transactions"
ON public.payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));
