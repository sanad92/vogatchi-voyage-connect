
-- Add old_values and new_values columns for tracking changes
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS old_values jsonb;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS new_values jsonb;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS entity_name text;

-- Make audit log immutable: deny UPDATE and DELETE
CREATE POLICY "Audit logs are immutable - no updates" ON public.admin_audit_log
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Audit logs are immutable - no deletes" ON public.admin_audit_log
  FOR DELETE TO authenticated USING (false);

-- Create a generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_action text;
  v_org_id uuid;
  v_entity_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_action := 'DELETE';
    v_org_id := (v_old->>'organization_id')::uuid;
    v_entity_name := COALESCE(v_old->>'name', v_old->>'customer_name', v_old->>'full_name', v_old->>'title', '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_action := 'UPDATE';
    v_org_id := (v_new->>'organization_id')::uuid;
    v_entity_name := COALESCE(v_new->>'name', v_new->>'customer_name', v_new->>'full_name', v_new->>'title', '');
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_action := 'INSERT';
    v_org_id := (v_new->>'organization_id')::uuid;
    v_entity_name := COALESCE(v_new->>'name', v_new->>'customer_name', v_new->>'full_name', v_new->>'title', '');
  END IF;

  INSERT INTO public.admin_audit_log (
    action, target_table, target_id, old_values, new_values,
    organization_id, user_id, entity_name, created_at
  ) VALUES (
    v_action,
    TG_TABLE_NAME,
    COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid),
    v_old,
    v_new,
    v_org_id,
    auth.uid(),
    v_entity_name,
    now()
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach audit triggers to key business tables
CREATE TRIGGER audit_hotel_bookings AFTER INSERT OR UPDATE OR DELETE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_flight_bookings AFTER INSERT OR UPDATE OR DELETE ON public.flight_bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_car_rentals AFTER INSERT OR UPDATE OR DELETE ON public.car_rentals
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_transport_bookings AFTER INSERT OR UPDATE OR DELETE ON public.transport_bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_quotes AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
