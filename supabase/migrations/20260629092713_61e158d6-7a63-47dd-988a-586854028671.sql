
-- =========================================================
-- 1) PAGES: add organization_id and scope policies
-- =========================================================
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS organization_id uuid;

DROP POLICY IF EXISTS "Org view pages" ON public.pages;
DROP POLICY IF EXISTS "Org insert pages" ON public.pages;
DROP POLICY IF EXISTS "Org update pages" ON public.pages;
DROP POLICY IF EXISTS "Org delete pages" ON public.pages;

CREATE POLICY "pages_select_org" ON public.pages FOR SELECT
  USING (
    is_platform_admin(auth.uid())
    OR organization_id IS NULL
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "pages_insert_org" ON public.pages FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "pages_update_org" ON public.pages FOR UPDATE
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "pages_delete_org" ON public.pages FOR DELETE
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );

-- =========================================================
-- 2) SERVICE_REQUESTS: add organization_id and scope policies
-- =========================================================
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS organization_id uuid;

DROP POLICY IF EXISTS "Org view service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "Org update service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "Org delete service_requests" ON public.service_requests;

CREATE POLICY "service_requests_select_org" ON public.service_requests FOR SELECT
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "service_requests_update_org" ON public.service_requests FOR UPDATE
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "service_requests_delete_org" ON public.service_requests FOR DELETE
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );

-- =========================================================
-- 3) RENT contracts & payments: drop overly permissive policies
-- =========================================================
DROP POLICY IF EXISTS "Org view rent_contracts"   ON public.rent_contracts;
DROP POLICY IF EXISTS "Org insert rent_contracts" ON public.rent_contracts;
DROP POLICY IF EXISTS "Org update rent_contracts" ON public.rent_contracts;
DROP POLICY IF EXISTS "Org delete rent_contracts" ON public.rent_contracts;

DROP POLICY IF EXISTS "Org view rent_payments"    ON public.rent_payments;
DROP POLICY IF EXISTS "Org insert rent_payments"  ON public.rent_payments;
DROP POLICY IF EXISTS "Org update rent_payments"  ON public.rent_payments;
DROP POLICY IF EXISTS "Org delete rent_payments"  ON public.rent_payments;

-- =========================================================
-- 4) Shared lookup tables: writes restricted to platform admins
-- =========================================================
DROP POLICY IF EXISTS "Write transport_routes"  ON public.transport_routes;
DROP POLICY IF EXISTS "Update transport_routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Delete transport_routes" ON public.transport_routes;
CREATE POLICY "transport_routes_admin_insert" ON public.transport_routes FOR INSERT
  WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "transport_routes_admin_update" ON public.transport_routes FOR UPDATE
  USING (is_platform_admin(auth.uid()));
CREATE POLICY "transport_routes_admin_delete" ON public.transport_routes FOR DELETE
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Write vehicle_types"  ON public.vehicle_types;
DROP POLICY IF EXISTS "Update vehicle_types" ON public.vehicle_types;
DROP POLICY IF EXISTS "Delete vehicle_types" ON public.vehicle_types;
CREATE POLICY "vehicle_types_admin_insert" ON public.vehicle_types FOR INSERT
  WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "vehicle_types_admin_update" ON public.vehicle_types FOR UPDATE
  USING (is_platform_admin(auth.uid()));
CREATE POLICY "vehicle_types_admin_delete" ON public.vehicle_types FOR DELETE
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Write special_request_types"  ON public.special_request_types;
DROP POLICY IF EXISTS "Update special_request_types" ON public.special_request_types;
DROP POLICY IF EXISTS "Delete special_request_types" ON public.special_request_types;
CREATE POLICY "special_request_types_admin_insert" ON public.special_request_types FOR INSERT
  WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "special_request_types_admin_update" ON public.special_request_types FOR UPDATE
  USING (is_platform_admin(auth.uid()));
CREATE POLICY "special_request_types_admin_delete" ON public.special_request_types FOR DELETE
  USING (is_platform_admin(auth.uid()));

-- =========================================================
-- 5) WHATSAPP: add organization_id to conversations & messages, scope policies
-- =========================================================
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.whatsapp_messages      ADD COLUMN IF NOT EXISTS organization_id uuid;

DROP POLICY IF EXISTS "Org view whatsapp_conversations"   ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Org insert whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Org update whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Org delete whatsapp_conversations" ON public.whatsapp_conversations;

CREATE POLICY "whatsapp_conversations_select_org" ON public.whatsapp_conversations FOR SELECT
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "whatsapp_conversations_insert_org" ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "whatsapp_conversations_update_org" ON public.whatsapp_conversations FOR UPDATE
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "whatsapp_conversations_delete_org" ON public.whatsapp_conversations FOR DELETE
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );

DROP POLICY IF EXISTS "Org view whatsapp_messages"   ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Org insert whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Org update whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Org delete whatsapp_messages" ON public.whatsapp_messages;

CREATE POLICY "whatsapp_messages_select_org" ON public.whatsapp_messages FOR SELECT
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_conversations c
      WHERE c.id = whatsapp_messages.conversation_id
        AND c.organization_id IS NOT NULL
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
  );
CREATE POLICY "whatsapp_messages_insert_org" ON public.whatsapp_messages FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_conversations c
      WHERE c.id = whatsapp_messages.conversation_id
        AND c.organization_id IS NOT NULL
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
  );
CREATE POLICY "whatsapp_messages_update_org" ON public.whatsapp_messages FOR UPDATE
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );
CREATE POLICY "whatsapp_messages_delete_org" ON public.whatsapp_messages FOR DELETE
  USING (
    is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  );

-- =========================================================
-- 6) PROFILES: allow org members to read each other
-- =========================================================
CREATE POLICY "profiles_select_org_peers" ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = profiles.id
        AND om.is_active = true
        AND om.organization_id = ANY (public.get_user_org_ids(auth.uid()))
    )
  );

-- =========================================================
-- 7) SECURITY DEFINER functions: revoke from anon + lock trigger funcs
-- =========================================================
DO $$
DECLARE r record; sig text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS ret
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    sig := format('public.%I(%s)', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', sig);
    -- Trigger-only functions should never be callable directly
    IF r.ret = 'trigger' THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', sig);
    END IF;
  END LOOP;
END $$;
