
-- ============================================================================
-- 1. INVOICE PAYMENT (via UPDATE on invoices.total_paid_amount)
-- Debit: Cash (1000) / Credit: Accounts Receivable (1100)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_invoice_payment_to_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_lines jsonb; 
  v_delta numeric;
  v_ref_id uuid;
BEGIN
  v_delta := COALESCE(NEW.total_paid_amount, 0) - COALESCE(OLD.total_paid_amount, 0);
  
  IF NEW.organization_id IS NULL OR v_delta <= 0 THEN RETURN NEW; END IF;
  
  -- Use a deterministic synthetic id based on invoice + paid amount snapshot
  v_ref_id := NEW.id;
  
  -- Skip if a payment journal already exists for this exact paid total
  IF EXISTS (
    SELECT 1 FROM public.journal_entries 
    WHERE reference_type='invoice_payment' 
      AND reference_id=NEW.id
      AND total_debit = v_delta
      AND entry_date = CURRENT_DATE
  ) THEN 
    RETURN NEW; 
  END IF;
  
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','1000','debit',v_delta,'credit',0,'description','تحصيل دفعة من عميل: ' || COALESCE(NEW.customer_name, '')),
    jsonb_build_object('account_code','1100','debit',0,'credit',v_delta,'description','تخفيض ذمم العميل')
  );
  
  PERFORM public.post_journal_entry(
    NEW.organization_id, 
    CURRENT_DATE,
    'تحصيل دفعة فاتورة ' || NEW.invoice_number, 
    'invoice_payment', 
    v_ref_id, 
    v_lines
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'invoice payment journal failed %: %', NEW.id, SQLERRM; 
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_invoice_payment_journal ON public.invoices;
CREATE TRIGGER trg_invoice_payment_journal 
AFTER UPDATE OF total_paid_amount ON public.invoices
FOR EACH ROW 
WHEN (NEW.total_paid_amount IS DISTINCT FROM OLD.total_paid_amount)
EXECUTE FUNCTION public.trg_invoice_payment_to_journal();


-- ============================================================================
-- 2. RENT PAYMENTS → JOURNAL ENTRY (only when paid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_rent_payment_to_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_lines jsonb; 
  v_amount numeric;
BEGIN
  v_amount := COALESCE(NEW.amount_egp, NEW.amount, 0);
  
  IF NEW.organization_id IS NULL OR v_amount = 0 THEN RETURN NEW; END IF;
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='rent_payment' AND reference_id=NEW.id) THEN 
    RETURN NEW; 
  END IF;
  
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','6100','debit',v_amount,'credit',0,'description','مصروف إيجار شهري'),
    jsonb_build_object('account_code','1000','debit',0,'credit',v_amount,'description','دفع إيجار نقدي')
  );
  
  PERFORM public.post_journal_entry(
    NEW.organization_id, 
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'سداد إيجار', 
    'rent_payment', 
    NEW.id, 
    v_lines
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'rent payment journal failed %: %', NEW.id, SQLERRM; 
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_rent_payment_journal ON public.rent_payments;
CREATE TRIGGER trg_rent_payment_journal 
AFTER INSERT OR UPDATE OF status ON public.rent_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_rent_payment_to_journal();


-- ============================================================================
-- 3. COMMISSION PAYMENTS → JOURNAL ENTRY
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_commission_payment_to_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_lines jsonb; 
  v_amount numeric;
  v_org_id uuid;
BEGIN
  v_amount := COALESCE(NEW.total_commission_amount, 0);
  v_org_id := NEW.organization_id;
  
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id FROM public.employees WHERE id = NEW.employee_id;
  END IF;
  
  IF v_org_id IS NULL OR v_amount = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='commission_payment' AND reference_id=NEW.id) THEN 
    RETURN NEW; 
  END IF;
  
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','6010','debit',v_amount,'credit',0,'description','مصروف عمولات موظف'),
    jsonb_build_object('account_code','1000','debit',0,'credit',v_amount,'description','دفع عمولات نقدي')
  );
  
  PERFORM public.post_journal_entry(
    v_org_id, 
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'سداد عمولات موظف', 
    'commission_payment', 
    NEW.id, 
    v_lines
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'commission payment journal failed %: %', NEW.id, SQLERRM; 
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_commission_payment_journal ON public.commission_payments;
CREATE TRIGGER trg_commission_payment_journal 
AFTER INSERT ON public.commission_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_commission_payment_to_journal();


-- ============================================================================
-- 4. AUTO-UPDATE BANK BALANCE on payments
-- ============================================================================

-- Invoice payment increase → bank balance increases
CREATE OR REPLACE FUNCTION public.trg_invoice_bank_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_delta numeric;
BEGIN
  v_delta := COALESCE(NEW.total_paid_amount, 0) - COALESCE(OLD.total_paid_amount, 0);
  -- Bank account on invoice is not standard; skip for now (can be added later)
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;

-- Supplier payment → bank balance decreases
CREATE OR REPLACE FUNCTION public.trg_supplier_payment_bank_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.bank_account_id IS NOT NULL AND COALESCE(NEW.amount, 0) > 0 THEN
    UPDATE public.bank_accounts 
    SET current_balance = COALESCE(current_balance, 0) - NEW.amount, 
        updated_at = now() 
    WHERE id = NEW.bank_account_id;
  ELSIF TG_OP = 'DELETE' AND OLD.bank_account_id IS NOT NULL AND COALESCE(OLD.amount, 0) > 0 THEN
    UPDATE public.bank_accounts 
    SET current_balance = COALESCE(current_balance, 0) + OLD.amount, 
        updated_at = now() 
    WHERE id = OLD.bank_account_id;
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'supplier payment bank update failed: %', SQLERRM; 
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_supplier_payment_bank ON public.supplier_payments;
CREATE TRIGGER trg_supplier_payment_bank
AFTER INSERT OR DELETE ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_payment_bank_balance();


-- Rent payment paid → bank balance decreases
CREATE OR REPLACE FUNCTION public.trg_rent_payment_bank_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_amount numeric;
BEGIN
  v_amount := COALESCE(NEW.amount_egp, NEW.amount, 0);
  
  IF TG_OP = 'INSERT' AND NEW.status = 'paid' AND NEW.bank_account_id IS NOT NULL AND v_amount > 0 THEN
    UPDATE public.bank_accounts 
    SET current_balance = COALESCE(current_balance, 0) - v_amount, 
        updated_at = now() 
    WHERE id = NEW.bank_account_id;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') <> 'paid' AND NEW.status = 'paid' 
        AND NEW.bank_account_id IS NOT NULL AND v_amount > 0 THEN
    UPDATE public.bank_accounts 
    SET current_balance = COALESCE(current_balance, 0) - v_amount, 
        updated_at = now() 
    WHERE id = NEW.bank_account_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'rent payment bank update failed: %', SQLERRM; 
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_rent_payment_bank ON public.rent_payments;
CREATE TRIGGER trg_rent_payment_bank
AFTER INSERT OR UPDATE OF status ON public.rent_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_rent_payment_bank_balance();


-- Commission payment → bank balance decreases
CREATE OR REPLACE FUNCTION public.trg_commission_payment_bank_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.bank_account_id IS NOT NULL AND COALESCE(NEW.total_commission_amount, 0) > 0 THEN
    UPDATE public.bank_accounts 
    SET current_balance = COALESCE(current_balance, 0) - NEW.total_commission_amount, 
        updated_at = now() 
    WHERE id = NEW.bank_account_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'commission payment bank update failed: %', SQLERRM; 
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_commission_payment_bank ON public.commission_payments;
CREATE TRIGGER trg_commission_payment_bank
AFTER INSERT ON public.commission_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_commission_payment_bank_balance();


-- ============================================================================
-- 5. BACKFILL existing rent + commission payments
-- ============================================================================
DO $$
DECLARE 
  r record;
  v_lines jsonb;
  v_amt numeric;
BEGIN
  -- Rent payments backfill
  FOR r IN 
    SELECT * FROM public.rent_payments
    WHERE status = 'paid' AND organization_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.journal_entries je 
      WHERE je.reference_type='rent_payment' AND je.reference_id=rent_payments.id
    )
  LOOP
    v_amt := COALESCE(r.amount_egp, r.amount, 0);
    IF v_amt > 0 THEN
      v_lines := jsonb_build_array(
        jsonb_build_object('account_code','6100','debit',v_amt,'credit',0,'description','مصروف إيجار (مرحّل)'),
        jsonb_build_object('account_code','1000','debit',0,'credit',v_amt,'description','دفع إيجار نقدي')
      );
      BEGIN
        PERFORM public.post_journal_entry(r.organization_id, COALESCE(r.payment_date, CURRENT_DATE),
          'سداد إيجار (مرحّل)', 'rent_payment', r.id, v_lines);
      EXCEPTION WHEN OTHERS THEN 
        RAISE WARNING 'backfill rent % failed: %', r.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  -- Commission payments backfill
  FOR r IN 
    SELECT cp.*, COALESCE(cp.organization_id, e.organization_id) as resolved_org_id
    FROM public.commission_payments cp
    LEFT JOIN public.employees e ON e.id = cp.employee_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.journal_entries je 
      WHERE je.reference_type='commission_payment' AND je.reference_id=cp.id
    )
  LOOP
    v_amt := COALESCE(r.total_commission_amount, 0);
    IF v_amt > 0 AND r.resolved_org_id IS NOT NULL THEN
      v_lines := jsonb_build_array(
        jsonb_build_object('account_code','6010','debit',v_amt,'credit',0,'description','مصروف عمولات (مرحّل)'),
        jsonb_build_object('account_code','1000','debit',0,'credit',v_amt,'description','دفع عمولات نقدي')
      );
      BEGIN
        PERFORM public.post_journal_entry(r.resolved_org_id, COALESCE(r.payment_date, CURRENT_DATE),
          'سداد عمولات (مرحّل)', 'commission_payment', r.id, v_lines);
      EXCEPTION WHEN OTHERS THEN 
        RAISE WARNING 'backfill commission % failed: %', r.id, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;
