-- Run after candidate DDL inside BEGIN/ROLLBACK with qa.quote_org/owner/agent.
CREATE TEMP TABLE qa_conversion_results(name text,passed boolean);
GRANT SELECT,INSERT ON qa_conversion_results TO authenticated;
CREATE FUNCTION pg_temp.conversion_assert(label text,ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
INSERT INTO qa_conversion_results VALUES(label,true); END $$;
CREATE TEMP TABLE qa_conversion_context AS SELECT
 current_setting('qa.quote_org')::uuid AS org,
 (SELECT id FROM public.customers WHERE organization_id=current_setting('qa.quote_org')::uuid ORDER BY id LIMIT 1) AS customer,
 (SELECT id FROM public.suppliers WHERE organization_id=current_setting('qa.quote_org')::uuid ORDER BY id LIMIT 1) AS supplier_a,
 (SELECT id FROM public.suppliers WHERE organization_id=current_setting('qa.quote_org')::uuid ORDER BY id OFFSET 1 LIMIT 1) AS supplier_b,
 NULL::uuid AS quote_id,NULL::uuid AS booking_id,NULL::uuid AS invoice_id;
GRANT SELECT,UPDATE ON qa_conversion_context TO authenticated;
UPDATE public.organization_settings SET currency='EGP',default_revenue_recognition_mode='principal_gross'
 WHERE organization_id=current_setting('qa.quote_org')::uuid;
CREATE FUNCTION pg_temp.fail_supplier_conversion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('qa.fail_supplier',true)='on' AND NEW.source_type='quote_items' AND NEW.service_type='flight' THEN
   RAISE EXCEPTION 'QA late supplier failure';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER qa_fail_supplier_conversion BEFORE INSERT ON public.supplier_payment_orders
 FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_supplier_conversion();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('qa.quote_owner'),true);
DO $$
DECLARE c record; payload jsonb; quote jsonb; result jsonb; retry jsonb;
bid uuid; iid uuid; qid uuid; bad_qid uuid; denied boolean; before_bookings bigint; before_invoices bigint;
BEGIN
 SELECT * INTO c FROM qa_conversion_context;
 PERFORM pg_temp.conversion_assert('fixture has two suppliers and customer',c.customer IS NOT NULL AND c.supplier_a IS NOT NULL AND c.supplier_b IS NOT NULL);
 payload:=jsonb_build_object('customer_id',c.customer,'status','sent','travel_date',current_date+10,'return_date',current_date+12,
  'number_of_travelers',2,'discount_amount',100,'vat_rate',14,'items',jsonb_build_array(
   jsonb_build_object('item_type','hotel','description','QA conversion hotel','supplier_id',c.supplier_a,'quantity',2,'cost_price',300,'selling_price',500),
   jsonb_build_object('item_type','flight','description','QA conversion flight','supplier_id',c.supplier_b,'quantity',1,'cost_price',300,'selling_price',500)));
 quote:=public.create_quote_atomic(c.org,gen_random_uuid(),payload); qid:=(quote->>'id')::uuid;
 result:=public.convert_quote_atomic(c.org,qid); bid:=(result->>'booking_id')::uuid; iid:=(result->>'invoice_id')::uuid;
 UPDATE qa_conversion_context SET quote_id=qid,booking_id=bid,invoice_id=iid;
 PERFORM pg_temp.conversion_assert('one canonical booking and one customer invoice',
  (SELECT count(*)=1 FROM public.bookings WHERE quote_id=qid) AND (SELECT count(*)=1 FROM public.invoices WHERE booking_id=bid));
 PERFORM pg_temp.conversion_assert('service totals, discount, tax and contribution agree',
  (SELECT selling_price=1400 AND cost_price=900 AND profit=500 FROM public.bookings WHERE id=bid)
  AND (SELECT subtotal=1500 AND discount_amount=100 AND vat_amount=196 AND final_amount=1596 FROM public.invoices WHERE id=iid));
 PERFORM pg_temp.conversion_assert('two suppliers receive only their own obligations',
  (SELECT count(*)=2 AND sum(amount)=900 FROM public.supplier_payment_orders WHERE booking_id=bid)
  AND (SELECT amount=600 FROM public.supplier_payment_orders WHERE booking_id=bid AND supplier_id=c.supplier_a)
  AND (SELECT amount=300 FROM public.supplier_payment_orders WHERE booking_id=bid AND supplier_id=c.supplier_b));
 PERFORM pg_temp.conversion_assert('supplier invoices use the canonical payment-order linkage',
  (SELECT count(*)=2 AND sum(amount)=900 FROM public.supplier_invoices WHERE booking_id=bid AND payment_order_id IS NOT NULL));
 PERFORM pg_temp.conversion_assert('one balanced customer journal',
  (SELECT count(*)=1 AND sum(total_debit)=1596 AND sum(total_credit)=1596 FROM public.journal_entries WHERE source_type='invoice' AND source_id=iid));
 PERFORM pg_temp.conversion_assert('supplier journals balance without duplicated costs',
  (SELECT count(*)=2 AND sum(total_debit)=900 AND sum(total_credit)=900 FROM public.journal_entries
    WHERE source_type='supplier_invoice' AND source_id IN (SELECT id FROM public.supplier_invoices WHERE booking_id=bid)));
 retry:=public.convert_quote_atomic(c.org,qid);
 PERFORM pg_temp.conversion_assert('retry returns persisted result',retry->>'booking_id'=bid::text AND retry->>'invoice_id'=iid::text AND (retry->>'already_converted')::boolean);
 PERFORM pg_temp.conversion_assert('legacy wrapper reuses same conversion',
   (SELECT booking_id=bid FROM public.convert_quote_to_bookings(qid)));
 PERFORM public.run_booking_automation(bid);
 PERFORM pg_temp.conversion_assert('automation replay does not duplicate supplier orders or invoice',
  (SELECT count(*)=2 FROM public.supplier_payment_orders WHERE booking_id=bid) AND (SELECT count(*)=1 FROM public.invoices WHERE booking_id=bid));
 UPDATE public.bookings SET status='confirmed' WHERE id=bid;
 PERFORM pg_temp.conversion_assert('multi-supplier booking can be confirmed',(SELECT status='confirmed' FROM public.bookings WHERE id=bid));
 denied:=false;
 BEGIN UPDATE public.bookings SET supplier_id=c.supplier_a WHERE id=bid;
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('cannot charge total package cost to one supplier',denied);
 denied:=false;
 BEGIN UPDATE public.quotes SET status='draft' WHERE id=qid;
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('converted source cannot be reset',denied);
 denied:=false;
 BEGIN UPDATE public.quote_items SET total_cost=1 WHERE quote_id=qid;
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('converted service prices cannot be silently rewritten',denied);
 denied:=false;
 BEGIN INSERT INTO public.hotel_bookings(quote_id,organization_id) VALUES(qid,c.org);
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('stale legacy frontend blocked before first insert',denied);
 denied:=false;
 BEGIN INSERT INTO public.invoices(quote_id,organization_id,booking_id) VALUES(qid,c.org,bid);
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('second consolidated invoice blocked before posting',denied);
 denied:=false;
 BEGIN UPDATE public.supplier_payment_orders SET amount=1 WHERE booking_id=bid;
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('converted supplier obligations cannot be silently repriced',denied);

 quote:=public.create_quote_atomic(c.org,gen_random_uuid(),payload); bad_qid:=(quote->>'id')::uuid;
 SELECT count(*) INTO before_bookings FROM public.bookings;
 SELECT count(*) INTO before_invoices FROM public.invoices;
 PERFORM set_config('qa.fail_supplier','on',true); denied:=false;
 BEGIN PERFORM public.convert_quote_atomic(c.org,bad_qid);
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'QA late supplier failure' THEN RAISE; END IF; denied:=true; END;
 PERFORM set_config('qa.fail_supplier','off',true);
 PERFORM pg_temp.conversion_assert('late supplier failure rolls back all financial records',denied
  AND (SELECT count(*) FROM public.bookings)=before_bookings AND (SELECT count(*) FROM public.invoices)=before_invoices
  AND NOT EXISTS(SELECT 1 FROM public.quote_booking_conversions WHERE quote_id=bad_qid)
  AND (SELECT status='sent' FROM public.quotes WHERE id=bad_qid));
 UPDATE public.quote_items SET total_selling=total_selling+1 WHERE quote_id=bad_qid;
 denied:=false;
 BEGIN PERFORM public.convert_quote_atomic(c.org,bad_qid); EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('tampered persisted totals rejected before booking',denied AND NOT EXISTS(SELECT 1 FROM public.bookings WHERE quote_id=bad_qid));
 UPDATE public.quote_items SET total_selling=round(quantity*selling_price,2),selling_price='NaN'::numeric WHERE quote_id=bad_qid;
 denied:=false;
 BEGIN PERFORM public.convert_quote_atomic(c.org,bad_qid); EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('nonfinite persisted price rejected',denied);
 denied:=false;
 BEGIN PERFORM public.convert_quote_atomic(gen_random_uuid(),qid); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('foreign organization rejected',denied);

 quote:=public.create_quote_atomic(c.org,gen_random_uuid(),payload); bad_qid:=(quote->>'id')::uuid;
 UPDATE public.quotes SET travel_date=NULL WHERE id=bad_qid;
 denied:=false;
 BEGIN PERFORM public.convert_quote_atomic(c.org,bad_qid); EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('missing travel date rejected before writing',denied AND NOT EXISTS(SELECT 1 FROM public.bookings WHERE quote_id=bad_qid));
 UPDATE public.quotes SET travel_date=current_date+10 WHERE id=bad_qid;
 UPDATE public.quote_items SET item_type='service' WHERE quote_id=bad_qid;
 denied:=false;
 BEGIN PERFORM public.convert_quote_atomic(c.org,bad_qid); EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('unsupported generic service rejected before writing',denied AND NOT EXISTS(SELECT 1 FROM public.bookings WHERE quote_id=bad_qid));

 payload:=jsonb_set(jsonb_set(payload,'{items,0,item_type}','"transport"'),'{items,1,item_type}','"car_rental"');
 quote:=public.create_quote_atomic(c.org,gen_random_uuid(),payload); bad_qid:=(quote->>'id')::uuid;
 result:=public.convert_quote_atomic(c.org,bad_qid); bid:=(result->>'booking_id')::uuid;
 PERFORM pg_temp.conversion_assert('transport and car rental use canonical detail tables',
  (SELECT count(*)=1 FROM public.booking_transport_details WHERE booking_id=bid)
  AND (SELECT count(*)=1 FROM public.booking_car_details WHERE booking_id=bid)
  AND (SELECT count(*)=2 AND sum(amount)=900 FROM public.supplier_payment_orders WHERE booking_id=bid)
  AND (SELECT selling_price=1400 AND cost_price=900 FROM public.bookings WHERE id=bid));
END $$;
RESET ROLE;
INSERT INTO public.organization_permission_overrides(organization_id,user_id,permission_key,granted,data_scope)
SELECT current_setting('qa.quote_org')::uuid,current_setting('qa.quote_agent')::uuid,k,true,'organization'
 FROM unnest(ARRAY['quotes_view','quotes_edit','bookings_create','invoices_create']) k
ON CONFLICT(organization_id,user_id,permission_key) DO UPDATE SET granted=true,data_scope='organization';
UPDATE public.organization_permission_overrides SET granted=false,data_scope='none'
 WHERE organization_id=current_setting('qa.quote_org')::uuid AND user_id=current_setting('qa.quote_agent')::uuid AND permission_key='quotes_edit';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('qa.quote_agent'),true);
DO $$ DECLARE denied boolean:=false; c record; BEGIN
 SELECT * INTO c FROM qa_conversion_context;
 BEGIN PERFORM public.convert_quote_atomic(c.org,c.quote_id); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('explicit permission denial also applies to replay',denied);
END $$;
RESET ROLE;
UPDATE public.organization_permission_overrides SET granted=true,data_scope='own'
 WHERE organization_id=current_setting('qa.quote_org')::uuid AND user_id=current_setting('qa.quote_agent')::uuid AND permission_key='quotes_edit';
SET LOCAL ROLE authenticated;
DO $$ DECLARE denied boolean:=false; c record; BEGIN
 SELECT * INTO c FROM qa_conversion_context;
 BEGIN PERFORM public.convert_quote_atomic(c.org,c.quote_id); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('own scope cannot convert another employees quote',denied);
END $$;
RESET ROLE;
UPDATE public.organization_permission_overrides SET granted=true,data_scope='organization'
 WHERE organization_id=current_setting('qa.quote_org')::uuid AND user_id=current_setting('qa.quote_agent')::uuid AND permission_key='quotes_edit';
SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; result jsonb; BEGIN
 SELECT * INTO c FROM qa_conversion_context;
 result:=public.convert_quote_atomic(c.org,c.quote_id);
 PERFORM pg_temp.conversion_assert('organization scope can retrieve authorized conversion',result->>'booking_id'=c.booking_id::text AND (result->>'already_converted')::boolean);
END $$;
RESET ROLE;
UPDATE public.organization_members SET is_active=false
 WHERE organization_id=current_setting('qa.quote_org')::uuid AND user_id=current_setting('qa.quote_agent')::uuid;
SET LOCAL ROLE authenticated;
DO $$ DECLARE denied boolean:=false; c record; BEGIN
 SELECT * INTO c FROM qa_conversion_context;
 BEGIN PERFORM public.convert_quote_atomic(c.org,c.quote_id); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.conversion_assert('inactive membership cannot convert or retrieve conversion',denied);
END $$;
RESET ROLE;
SELECT jsonb_agg(to_jsonb(r)) AS conversion_results FROM qa_conversion_results r;
