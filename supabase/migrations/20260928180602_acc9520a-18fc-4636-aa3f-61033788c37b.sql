ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS review_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_approved_by uuid,
  ADD COLUMN IF NOT EXISTS review_checklist jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Approve a draft quote after availability, cost, currency and total are confirmed.
CREATE OR REPLACE FUNCTION public.approve_quote_review(_quote uuid, _checks jsonb, _costs jsonb DEFAULT '{}'::jsonb)
RETURNS public.quotes LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; k text; c numeric; it record; costs numeric;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id=_quote FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العرض غير موجود' USING ERRCODE='P0002'; END IF;
  IF NOT public.can_org_write(q.organization_id) OR NOT public.has_org_permission(q.organization_id,'quotes_edit') THEN
    RAISE EXCEPTION 'ليست لديك صلاحية اعتماد العروض' USING ERRCODE='42501';
  END IF;
  IF q.status <> 'draft' THEN RAISE EXCEPTION 'يمكن اعتماد المسودات فقط' USING ERRCODE='22023'; END IF;
  FOREACH k IN ARRAY ARRAY['availability','cost','currency','total'] LOOP
    IF COALESCE((_checks->>k)::boolean,false) IS NOT TRUE THEN
      RAISE EXCEPTION 'أكمل كل بنود المراجعة قبل الاعتماد' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF jsonb_typeof(COALESCE(_costs,'{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'تكاليف غير صحيحة' USING ERRCODE='22023'; END IF;
  FOR k IN SELECT jsonb_object_keys(COALESCE(_costs,'{}'::jsonb)) LOOP
    c := (_costs->>k)::numeric;
    IF c IS NULL OR c < 0 OR c > 1000000000000 OR c::text IN ('NaN','Infinity') THEN
      RAISE EXCEPTION 'تكلفة البند غير صحيحة' USING ERRCODE='22023';
    END IF;
    UPDATE public.quote_items SET cost_price=c, total_cost=round(c*COALESCE(quantity,1),2),
      details = COALESCE(details,'{}'::jsonb) - 'needs_cost_review'
      WHERE id=k::uuid AND quote_id=q.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'البند لا يتبع العرض' USING ERRCODE='22023'; END IF;
  END LOOP;
  FOR it IN SELECT * FROM public.quote_items WHERE quote_id=q.id LOOP
    IF COALESCE(it.cost_price,0) <= 0 THEN RAISE EXCEPTION 'أدخل تكلفة كل البنود قبل الاعتماد' USING ERRCODE='22023'; END IF;
  END LOOP;
  IF COALESCE(q.total_amount,0) <= 0 THEN RAISE EXCEPTION 'إجمالي العرض يجب أن يكون أكبر من صفر' USING ERRCODE='22023'; END IF;
  SELECT COALESCE(sum(total_cost),0) INTO costs FROM public.quote_items WHERE quote_id=q.id;
  UPDATE public.quotes SET total_cost=costs, total_profit=subtotal-COALESCE(discount_amount,0)-costs,
    review_approved_at=now(), review_approved_by=auth.uid(),
    review_checklist=jsonb_build_object('availability',true,'cost',true,'currency',true,'total',true,'currency_code',currency,'total_amount',total_amount)
    WHERE id=q.id RETURNING * INTO q;
  RETURN q;
END $$;
REVOKE ALL ON FUNCTION public.approve_quote_review(uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_quote_review(uuid,jsonb,jsonb) TO authenticated;

-- Block sending/accepting a draft that was not approved; any later price/item change voids approval.
CREATE OR REPLACE FUNCTION public.guard_quote_review() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status='draft' AND NEW.status IN ('sent','accepted') AND NEW.review_approved_at IS NULL THEN
    RAISE EXCEPTION 'لا يمكن إرسال العرض قبل اعتماد المراجعة: تأكيد التوافر، التكلفة، العملة، والإجمالي' USING ERRCODE='22023';
  END IF;
  IF NEW.status='draft' AND OLD.review_approved_at IS NOT NULL AND NEW.review_approved_at IS NOT DISTINCT FROM OLD.review_approved_at
     AND (NEW.total_amount IS DISTINCT FROM OLD.total_amount OR NEW.currency IS DISTINCT FROM OLD.currency) THEN
    NEW.review_approved_at := NULL; NEW.review_approved_by := NULL; NEW.review_checklist := '{}'::jsonb;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_quote_review ON public.quotes;
CREATE TRIGGER guard_quote_review BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.guard_quote_review();

CREATE OR REPLACE FUNCTION public.void_quote_review_on_item_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE qid uuid := COALESCE(NEW.quote_id, OLD.quote_id);
BEGIN
  IF TG_OP='UPDATE' AND NEW.selling_price IS NOT DISTINCT FROM OLD.selling_price
     AND NEW.quantity IS NOT DISTINCT FROM OLD.quantity AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
    RETURN NEW;
  END IF;
  UPDATE public.quotes SET review_approved_at=NULL, review_approved_by=NULL, review_checklist='{}'::jsonb
    WHERE id=qid AND status='draft' AND review_approved_at IS NOT NULL;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS void_quote_review_on_item_change ON public.quote_items;
CREATE TRIGGER void_quote_review_on_item_change AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.void_quote_review_on_item_change();