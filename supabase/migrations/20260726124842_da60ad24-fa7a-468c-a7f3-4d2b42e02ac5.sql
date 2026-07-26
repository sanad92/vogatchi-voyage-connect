-- Sprint 10.1: Demo Mode flag + safe reset RPC
ALTER TABLE public.customers        ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings         ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices         ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.suppliers        ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.quotes           ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customers_org_demo  ON public.customers(organization_id) WHERE is_demo;
CREATE INDEX IF NOT EXISTS idx_bookings_org_demo   ON public.bookings(organization_id)  WHERE is_demo;
CREATE INDEX IF NOT EXISTS idx_invoices_org_demo   ON public.invoices(organization_id)  WHERE is_demo;
CREATE INDEX IF NOT EXISTS idx_suppliers_org_demo  ON public.suppliers(organization_id) WHERE is_demo;
CREATE INDEX IF NOT EXISTS idx_quotes_org_demo     ON public.quotes(organization_id)    WHERE is_demo;
CREATE INDEX IF NOT EXISTS idx_cust_pay_org_demo   ON public.customer_payments(organization_id) WHERE is_demo;

-- Safe reset: only org owner/admin, only their own org, only demo rows
CREATE OR REPLACE FUNCTION public.reset_demo_data(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_counts jsonb := '{}'::jsonb;
  v_n int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = v_uid
      AND is_active = true
      AND role IN ('owner','admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  DELETE FROM public.customer_payments WHERE organization_id = _org_id AND is_demo = true;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('customer_payments', v_n);

  DELETE FROM public.invoices WHERE organization_id = _org_id AND is_demo = true;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('invoices', v_n);

  DELETE FROM public.bookings WHERE organization_id = _org_id AND is_demo = true;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('bookings', v_n);

  DELETE FROM public.quotes WHERE organization_id = _org_id AND is_demo = true;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('quotes', v_n);

  DELETE FROM public.customers WHERE organization_id = _org_id AND is_demo = true;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('customers', v_n);

  DELETE FROM public.suppliers WHERE organization_id = _org_id AND is_demo = true;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('suppliers', v_n);

  RETURN jsonb_build_object('ok', true, 'deleted', v_counts);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_demo_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_demo_data(uuid) TO authenticated;