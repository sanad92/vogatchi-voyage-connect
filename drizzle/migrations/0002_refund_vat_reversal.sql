CREATE OR REPLACE FUNCTION public.post_customer_refund(_refund_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  r public.refund_requests%ROWTYPE;
  v_je uuid;
  v_cash uuid;
  v_advance uuid;
  v_returns uuid;
  v_tax uuid;
  v_treasury_kind text;
  v_treasury_currency text;
  v_inv_final numeric := 0;
  v_inv_vat numeric := 0;
  v_vat_part numeric := 0;
  v_net_return numeric := 0;
  v_line integer := 1;
BEGIN
  SELECT * INTO r FROM public.refund_requests WHERE id=_refund_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT id INTO v_je FROM public.journal_entries
  WHERE organization_id=r.organization_id AND source_type='customer_refund' AND source_id=r.id;

  IF r.status<>'paid' OR r.amount<=0 THEN
    IF v_je IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE id=v_je AND is_locked) THEN
      DELETE FROM public.journal_entries WHERE id=v_je;
    END IF;
    RETURN NULL;
  END IF;
  IF v_je IS NOT NULL AND EXISTS (SELECT 1 FROM public.journal_entries WHERE id=v_je AND is_locked) THEN
    RETURN v_je;
  END IF;

  SELECT treasury_kind,upper(COALESCE(currency,'EGP')) INTO v_treasury_kind,v_treasury_currency
  FROM public.bank_accounts
  WHERE id=r.treasury_account_id AND organization_id=r.organization_id AND is_active;
  IF v_treasury_kind IS NULL OR v_treasury_currency<>r.currency THEN
    RAISE EXCEPTION 'Refund treasury is missing, inactive, or uses another currency';
  END IF;

  v_cash:=public._resolve_account(r.organization_id, CASE WHEN v_treasury_kind='cash' THEN '1000' ELSE '1010' END);
  v_advance:=public._resolve_account(r.organization_id,'2050');
  v_returns:=public._resolve_account(r.organization_id,'4050');
  IF v_cash IS NULL OR v_advance IS NULL OR v_returns IS NULL THEN
    RAISE EXCEPTION 'Missing cash, customer-advance, or sales-return account';
  END IF;

  -- VAT reversal: the sales-return part carries the same VAT share as the
  -- source invoice (VAT / final amount). Advance refunds carry no VAT.
  IF r.sales_return_component>0 AND r.invoice_id IS NOT NULL THEN
    SELECT COALESCE(final_amount,0),COALESCE(vat_amount,0) INTO v_inv_final,v_inv_vat
    FROM public.invoices WHERE id=r.invoice_id AND organization_id=r.organization_id;
    IF COALESCE(v_inv_final,0)>0 AND COALESCE(v_inv_vat,0)>0 THEN
      v_vat_part:=round(r.sales_return_component*v_inv_vat/v_inv_final,2);
      v_vat_part:=LEAST(v_vat_part,r.sales_return_component);
    END IF;
  END IF;
  v_net_return:=round(r.sales_return_component-v_vat_part,2);
  IF v_vat_part>0 THEN
    v_tax:=public._resolve_account(r.organization_id,'2100');
    IF v_tax IS NULL THEN RAISE EXCEPTION 'Missing VAT account for refund VAT reversal'; END IF;
  END IF;

  DELETE FROM public.journal_entries WHERE id=v_je AND NOT is_locked;
  INSERT INTO public.journal_entries (
    organization_id,entry_number,entry_date,reference_type,reference_id,
    description,total_debit,total_credit,status,currency,source_type,source_id,
    booking_id,functional_currency,fx_rate,posted_at,auto_generated
  ) VALUES (
    r.organization_id,public._next_entry_number(r.organization_id),
    COALESCE(r.paid_at::date,CURRENT_DATE),'customer_refund',r.id,
    'Customer refund',r.amount,r.amount,'posted',r.currency,
    'customer_refund',r.id,r.booking_id,r.currency,r.exchange_rate,now(),true
  ) RETURNING id INTO v_je;

  IF r.advance_component>0 THEN
    INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit,credit,description,line_order)
    VALUES (v_je,v_advance,r.advance_component,0,'رد دفعة مقدمة للعميل',v_line);
    v_line:=v_line+1;
  END IF;
  IF v_net_return>0 THEN
    INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit,credit,description,line_order)
    VALUES (v_je,v_returns,v_net_return,0,'مردود مبيعات للعميل (صافي)',v_line);
    v_line:=v_line+1;
  END IF;
  IF v_vat_part>0 THEN
    INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit,credit,description,line_order)
    VALUES (v_je,v_tax,v_vat_part,0,'عكس ضريبة القيمة المضافة على المردود',v_line);
    v_line:=v_line+1;
  END IF;
  INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit,credit,description,line_order)
  VALUES (v_je,v_cash,0,r.amount,'صرف الاسترداد',v_line);
  RETURN v_je;
END;
$$;