
DROP FUNCTION IF EXISTS public.backfill_journals(uuid);

CREATE OR REPLACE FUNCTION public.post_customer_payment(_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  cash_id uuid;
  ar_id uuid;
  je_id uuid;
  ent_no text;
  base_amt numeric;
BEGIN
  SELECT * INTO p FROM public.customer_payments WHERE id = _payment_id;
  IF NOT FOUND OR p.status <> 'completed' THEN RETURN NULL; END IF;

  SELECT id INTO je_id FROM public.journal_entries
   WHERE organization_id = p.organization_id
     AND source_type = 'customer_payment' AND source_id = p.id;
  IF je_id IS NOT NULL THEN RETURN je_id; END IF;

  SELECT id INTO cash_id FROM public.chart_of_accounts
    WHERE organization_id = p.organization_id AND account_code = '1010' LIMIT 1;
  SELECT id INTO ar_id FROM public.chart_of_accounts
    WHERE organization_id = p.organization_id AND account_code = '1200' LIMIT 1;
  IF cash_id IS NULL OR ar_id IS NULL THEN
    PERFORM public.seed_default_chart_of_accounts(p.organization_id);
    SELECT id INTO cash_id FROM public.chart_of_accounts
      WHERE organization_id = p.organization_id AND account_code = '1010' LIMIT 1;
    SELECT id INTO ar_id FROM public.chart_of_accounts
      WHERE organization_id = p.organization_id AND account_code = '1200' LIMIT 1;
  END IF;
  IF cash_id IS NULL OR ar_id IS NULL THEN RETURN NULL; END IF;

  base_amt := COALESCE(p.amount_base, p.amount * COALESCE(p.exchange_rate, 1));
  ent_no := public.generate_journal_entry_number(p.organization_id);

  INSERT INTO public.journal_entries(
    organization_id, entry_number, entry_date, description,
    total_debit, total_credit, status, currency, source_type, source_id,
    booking_id, fx_rate, auto_generated, posted_at, reference_type, reference_id
  ) VALUES (
    p.organization_id, ent_no, p.payment_date,
    'دفعة عميل ' || COALESCE(p.reference_number, p.id::text),
    base_amt, base_amt, 'posted', p.currency, 'customer_payment', p.id,
    p.booking_id, COALESCE(p.exchange_rate, 1), true, now(),
    'customer_payment', p.id
  ) RETURNING id INTO je_id;

  INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
  VALUES
    (je_id, cash_id, base_amt, 0, 'استلام نقدية', 1),
    (je_id, ar_id, 0, base_amt, 'تسوية ذمم عميل', 2);

  RETURN je_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.post_customer_payment(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.post_customer_payment(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_customer_payment_to_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.post_customer_payment(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_customer_payment_to_journal ON public.customer_payments;
CREATE TRIGGER trg_customer_payment_to_journal
AFTER INSERT OR UPDATE OF status ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_customer_payment_to_journal();

CREATE OR REPLACE FUNCTION public.backfill_journals(_org_id uuid)
RETURNS TABLE(invoices_posted integer, supplier_payments_posted integer, expenses_posted integer, customer_payments_posted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  r record; i int := 0; s int := 0; e int := 0; c int := 0;
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  FOR r IN SELECT id FROM public.invoices WHERE organization_id=_org_id LOOP
    IF public.post_invoice(r.id) IS NOT NULL THEN i := i+1; END IF;
  END LOOP;

  FOR r IN SELECT sp.id FROM public.supplier_payments sp
    JOIN public.suppliers su ON su.id=sp.supplier_id WHERE su.organization_id=_org_id LOOP
    IF public.post_supplier_payment(r.id) IS NOT NULL THEN s := s+1; END IF;
  END LOOP;

  FOR r IN SELECT id FROM public.expense_transactions WHERE organization_id=_org_id LOOP
    IF public.post_expense_transaction(r.id) IS NOT NULL THEN e := e+1; END IF;
  END LOOP;

  FOR r IN SELECT id FROM public.customer_payments
           WHERE organization_id=_org_id AND status='completed' LOOP
    IF public.post_customer_payment(r.id) IS NOT NULL THEN c := c+1; END IF;
  END LOOP;

  RETURN QUERY SELECT i, s, e, c;
END $function$;

REVOKE EXECUTE ON FUNCTION public.backfill_journals(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.backfill_journals(uuid) TO authenticated, service_role;
