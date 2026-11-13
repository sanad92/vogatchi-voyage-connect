BEGIN;

CREATE SCHEMA branch_pos_private;
REVOKE ALL ON SCHEMA branch_pos_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA branch_pos_private TO authenticated;

ALTER TABLE public.branches ADD COLUMN pos_cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX pos_branch_cost_center_unique ON public.branches(pos_cost_center_id) WHERE pos_cost_center_id IS NOT NULL;

DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['quotes','bookings','invoices','bank_accounts'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN sales_branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT', relation);
    EXECUTE format('CREATE INDEX ON public.%I (organization_id, sales_branch_id) WHERE sales_branch_id IS NOT NULL', relation);
  END LOOP;
END;
$$;

CREATE FUNCTION branch_pos_private.can_use(_org uuid, _branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    LEFT JOIN public.branches b ON b.id = _branch AND b.organization_id = m.organization_id
    WHERE m.organization_id = _org AND m.user_id = (SELECT auth.uid()) AND m.is_active
      AND (_branch IS NULL OR b.id IS NOT NULL)
      AND (m.role IN ('owner','admin') OR (b.is_active AND m.branch_id = b.id))
  );
$$;

CREATE FUNCTION branch_pos_private.can_manage(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(public.get_user_org_role((SELECT auth.uid()), _org)::text, '') IN ('owner','admin')
    AND coalesce(public.can_org_write(_org), false);
$$;

CREATE FUNCTION branch_pos_private.can_collect(_org uuid, _branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT branch_pos_private.can_use(_org, _branch)
    AND coalesce(public.can_process_org_payments(_org), false)
    AND coalesce(public.has_org_permission(_org, 'payments_process'), false);
$$;

-- Preserve the original sales attribution independently of later staff transfers.
CREATE FUNCTION branch_pos_private.attribute_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE inherited uuid; parent_found boolean; linked boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id
    AND (OLD.sales_branch_id IS NOT NULL OR NEW.sales_branch_id IS NOT NULL) THEN
    RAISE EXCEPTION 'لا يمكن نقل مستند منسوب لفرع لمؤسسة أخرى' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.sales_branch_id IS NOT DISTINCT FROM OLD.sales_branch_id THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.sales_branch_id IS NOT NULL OR NOT branch_pos_private.can_manage(NEW.organization_id)) THEN
    RAISE EXCEPTION 'تعديل فرع المستند متاح لإدارة المؤسسة' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME = 'invoices' AND (to_jsonb(NEW)->>'booking_id') IS NOT NULL THEN
    SELECT b.sales_branch_id INTO inherited FROM public.bookings b
    WHERE b.id = (to_jsonb(NEW)->>'booking_id')::uuid AND b.organization_id = NEW.organization_id;
    linked := FOUND;
  END IF;
  IF TG_TABLE_NAME IN ('bookings','invoices') AND NOT linked AND (to_jsonb(NEW)->>'quote_id') IS NOT NULL THEN
    SELECT q.sales_branch_id INTO inherited FROM public.quotes q
    WHERE q.id = (to_jsonb(NEW)->>'quote_id')::uuid AND q.organization_id = NEW.organization_id;
    linked := FOUND;
  END IF;
  IF TG_OP = 'UPDATE' AND linked AND inherited IS NOT NULL AND NEW.sales_branch_id IS DISTINCT FROM inherited THEN
    RAISE EXCEPTION 'فرع المستند يجب أن يطابق المصدر';
  END IF;
  IF TG_OP = 'INSERT' AND linked THEN
    IF NEW.sales_branch_id IS NOT NULL AND NEW.sales_branch_id IS DISTINCT FROM inherited THEN
      RAISE EXCEPTION 'فرع المستند يجب أن يطابق المصدر';
    END IF;
    NEW.sales_branch_id := inherited;
  ELSIF TG_OP = 'INSERT' AND NEW.sales_branch_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT m.branch_id INTO NEW.sales_branch_id FROM public.organization_members m
    JOIN public.branches b ON b.id = m.branch_id AND b.organization_id = m.organization_id AND b.is_active
    WHERE m.organization_id = NEW.organization_id AND m.user_id = auth.uid() AND m.is_active;
  END IF;
  IF NEW.sales_branch_id IS NOT NULL THEN
    SELECT EXISTS (SELECT FROM public.branches b
      WHERE b.id = NEW.sales_branch_id AND b.organization_id = NEW.organization_id) INTO parent_found;
    IF NOT parent_found OR (NOT linked AND auth.uid() IS NOT NULL
        AND NOT branch_pos_private.can_use(NEW.organization_id, NEW.sales_branch_id)) THEN
      RAISE EXCEPTION 'الفرع خارج الصلاحية' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['quotes','bookings','invoices'] LOOP
    EXECUTE format('CREATE TRIGGER pos_attribute_document BEFORE INSERT OR UPDATE OF sales_branch_id, organization_id ON public.%I
      FOR EACH ROW EXECUTE FUNCTION branch_pos_private.attribute_document()', relation);
  END LOOP;
END;
$$;

-- Keep quote creation atomic and include the optional branch in its request fingerprint.
DO $$
DECLARE definition text := pg_get_functiondef('public.create_quote_atomic(uuid,uuid,jsonb)'::regprocedure);
BEGIN
  IF strpos(definition,'currency,creation_request_id,creation_request_hash)') = 0
    OR strpos(definition,'_request_id,md5(_payload::text)) RETURNING') = 0 THEN
    RAISE EXCEPTION 'Unexpected create_quote_atomic definition';
  END IF;
  definition := replace(definition,'currency,creation_request_id,creation_request_hash)',
    'currency,creation_request_id,creation_request_hash,sales_branch_id)');
  definition := replace(definition,'_request_id,md5(_payload::text)) RETURNING',
    $sql$_request_id,md5(_payload::text),nullif(_payload->>'sales_branch_id','')::uuid) RETURNING$sql$);
  EXECUTE definition;
END;
$$;

CREATE TABLE public.pos_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  cash_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, branch_id, name)
);

CREATE TABLE public.pos_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  terminal_id uuid NOT NULL REFERENCES public.pos_terminals(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  cash_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  currency text NOT NULL,
  opened_by uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  opening_cash numeric(18,2) NOT NULL CHECK (opening_cash >= 0),
  opening_book numeric(18,2) NOT NULL,
  closed_by uuid,
  closed_at timestamptz,
  expected_cash numeric(18,2),
  counted_cash numeric(18,2),
  closing_note text,
  variance_reviewed_by uuid,
  variance_reviewed_at timestamptz,
  variance_review_note text
);
CREATE UNIQUE INDEX pos_open_shift_per_cash_account ON public.pos_shifts(cash_account_id) WHERE closed_at IS NULL;
CREATE UNIQUE INDEX pos_open_shift_per_cashier ON public.pos_shifts(organization_id,opened_by) WHERE closed_at IS NULL;
CREATE INDEX pos_shifts_org_recent ON public.pos_shifts(organization_id,opened_at DESC);
CREATE INDEX pos_terminals_org_branch ON public.pos_terminals(organization_id,branch_id);

CREATE TABLE public.pos_receipts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  terminal_id uuid NOT NULL REFERENCES public.pos_terminals(id) ON DELETE RESTRICT,
  shift_id uuid REFERENCES public.pos_shifts(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL UNIQUE REFERENCES public.customer_payments(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  cash_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  collected_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  method text NOT NULL,
  exchange_rate numeric NOT NULL,
  reference text,
  invoice_number text NOT NULL,
  customer_name text
);
CREATE INDEX pos_receipts_org_recent ON public.pos_receipts(organization_id,created_at DESC);
CREATE INDEX pos_receipts_shift ON public.pos_receipts(shift_id);

ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_receipts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.pos_terminals, public.pos_shifts, public.pos_receipts TO authenticated;
GRANT ALL ON public.pos_terminals, public.pos_shifts, public.pos_receipts TO service_role;
CREATE POLICY pos_terminals_read ON public.pos_terminals FOR SELECT TO authenticated
  USING (branch_pos_private.can_use(organization_id, branch_id) AND public.has_org_permission(organization_id,'payments_view'));
CREATE POLICY pos_shifts_read ON public.pos_shifts FOR SELECT TO authenticated
  USING (branch_pos_private.can_use(organization_id, branch_id) AND public.has_org_permission(organization_id,'payments_view'));
CREATE POLICY pos_receipts_read ON public.pos_receipts FOR SELECT TO authenticated
  USING (branch_pos_private.can_use(organization_id, branch_id) AND public.has_org_permission(organization_id,'payments_view'));

CREATE FUNCTION branch_pos_private.guard_configuration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'branches' THEN
    IF NEW.pos_cost_center_id IS NOT NULL AND NOT EXISTS (
      SELECT FROM public.cost_centers WHERE id = NEW.pos_cost_center_id AND organization_id = NEW.organization_id
    ) THEN RAISE EXCEPTION 'مركز التكلفة خارج المؤسسة'; END IF;
  ELSE
    IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id
      AND (OLD.sales_branch_id IS NOT NULL OR NEW.sales_branch_id IS NOT NULL) THEN
      RAISE EXCEPTION 'لا يمكن نقل خزينة منسوبة لفرع لمؤسسة أخرى';
    END IF;
    IF NEW.sales_branch_id IS NOT NULL AND auth.uid() IS NOT NULL
      AND (TG_OP = 'INSERT' OR NEW.sales_branch_id IS DISTINCT FROM OLD.sales_branch_id)
      AND NOT branch_pos_private.can_manage(NEW.organization_id) THEN
      RAISE EXCEPTION 'ربط الخزينة بفرع متاح لإدارة المؤسسة' USING ERRCODE = '42501';
    END IF;
    IF NEW.sales_branch_id IS NOT NULL AND NOT EXISTS (
      SELECT FROM public.branches WHERE id = NEW.sales_branch_id AND organization_id = NEW.organization_id
    ) THEN RAISE EXCEPTION 'الخزينة والفرع لازم يكونوا في نفس المؤسسة'; END IF;
    IF TG_OP = 'UPDATE' AND NEW.sales_branch_id IS DISTINCT FROM OLD.sales_branch_id THEN
      IF auth.uid() IS NOT NULL AND NOT branch_pos_private.can_manage(NEW.organization_id) THEN
        RAISE EXCEPTION 'تعديل فرع الخزينة متاح لإدارة المؤسسة' USING ERRCODE = '42501';
      END IF;
      IF EXISTS (SELECT FROM public.pos_terminals WHERE cash_account_id = NEW.id AND is_active) THEN
        RAISE EXCEPTION 'أوقف نقاط البيع المرتبطة بالخزينة قبل تغيير فرعها';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pos_branch_center BEFORE INSERT OR UPDATE OF pos_cost_center_id, organization_id ON public.branches
FOR EACH ROW EXECUTE FUNCTION branch_pos_private.guard_configuration();
CREATE TRIGGER pos_account_branch BEFORE INSERT OR UPDATE OF sales_branch_id, organization_id ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION branch_pos_private.guard_configuration();

CREATE FUNCTION branch_pos_private.save_terminal(_org uuid, _id uuid, _branch uuid, _account uuid, _name text, _active boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE terminal public.pos_terminals;
BEGIN
  IF NOT branch_pos_private.can_manage(_org) THEN RAISE EXCEPTION 'غير مصرح' USING ERRCODE = '42501'; END IF;
  IF _id IS NOT NULL THEN
    SELECT * INTO STRICT terminal FROM public.pos_terminals WHERE id = _id AND organization_id = _org FOR UPDATE;
    IF EXISTS (SELECT FROM public.pos_shifts WHERE terminal_id = _id AND closed_at IS NULL) THEN
      RAISE EXCEPTION 'اقفل وردية نقطة البيع قبل تعديلها';
    END IF;
    IF (terminal.branch_id,terminal.cash_account_id) IS DISTINCT FROM (_branch,_account) THEN
      RAISE EXCEPTION 'أنشئ نقطة بيع جديدة لتغيير الفرع أو الخزينة';
    END IF;
  END IF;
  IF coalesce(_active, false) AND NOT EXISTS (
    SELECT FROM public.bank_accounts a JOIN public.branches b ON b.id = a.sales_branch_id AND b.organization_id = a.organization_id
    WHERE a.id = _account AND a.organization_id = _org AND a.sales_branch_id = _branch
      AND a.treasury_kind = 'cash' AND a.is_active AND b.is_active FOR UPDATE OF a
  ) THEN RAISE EXCEPTION 'اختار خزينة نقدية نشطة تابعة للفرع'; END IF;
  IF _id IS NULL THEN
    IF _active IS NOT TRUE THEN RAISE EXCEPTION 'نقطة البيع الجديدة يجب أن تكون نشطة'; END IF;
    INSERT INTO public.pos_terminals(organization_id,branch_id,cash_account_id,name)
    VALUES (_org,_branch,_account,btrim(_name)) RETURNING id INTO _id;
  ELSE
    UPDATE public.pos_terminals SET name = btrim(_name), is_active = _active WHERE id = _id;
  END IF;
  RETURN _id;
END;
$$;

CREATE FUNCTION branch_pos_private.set_member_branch(_org uuid, _member uuid, _branch uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT branch_pos_private.can_manage(_org) THEN RAISE EXCEPTION 'غير مصرح' USING ERRCODE = '42501'; END IF;
  IF _branch IS NOT NULL AND NOT EXISTS (
    SELECT FROM public.branches WHERE id = _branch AND organization_id = _org AND is_active
  ) THEN RAISE EXCEPTION 'الفرع غير متاح'; END IF;
  UPDATE public.organization_members SET branch_id = _branch
  WHERE id = _member AND organization_id = _org AND is_active AND role NOT IN ('owner','admin');
  IF NOT FOUND THEN RAISE EXCEPTION 'الموظف غير متاح'; END IF;
END;
$$;

CREATE FUNCTION branch_pos_private.set_document_branch(_org uuid, _invoice uuid, _branch uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE doc public.invoices; booking_branch uuid; quote_branch uuid; quote_id_to_update uuid;
BEGIN
  IF NOT branch_pos_private.can_manage(_org) OR NOT branch_pos_private.can_use(_org, _branch) OR _branch IS NULL THEN
    RAISE EXCEPTION 'غير مصرح' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT FROM public.branches WHERE id = _branch AND organization_id = _org AND is_active) THEN
    RAISE EXCEPTION 'اختار فرعًا نشطًا';
  END IF;
  SELECT * INTO STRICT doc FROM public.invoices WHERE id = _invoice AND organization_id = _org FOR UPDATE;
  IF doc.sales_branch_id IS NOT NULL THEN RAISE EXCEPTION 'الفاتورة منسوبة لفرع بالفعل'; END IF;
  quote_id_to_update := doc.quote_id;
  IF doc.booking_id IS NOT NULL THEN
    SELECT b.sales_branch_id, coalesce(b.quote_id, quote_id_to_update)
    INTO STRICT booking_branch, quote_id_to_update FROM public.bookings b
    WHERE b.id = doc.booking_id AND b.organization_id = _org FOR UPDATE;
  END IF;
  IF quote_id_to_update IS NOT NULL THEN
    SELECT sales_branch_id INTO STRICT quote_branch FROM public.quotes
    WHERE id = quote_id_to_update AND organization_id = _org FOR UPDATE;
  END IF;
  IF coalesce(booking_branch,_branch) <> _branch OR coalesce(quote_branch,_branch) <> _branch THEN
    RAISE EXCEPTION 'الفرع المحدد مختلف عن فرع الحجز أو العرض';
  END IF;
  UPDATE public.quotes SET sales_branch_id = _branch WHERE id = quote_id_to_update AND sales_branch_id IS NULL;
  UPDATE public.bookings SET sales_branch_id = _branch WHERE id = doc.booking_id AND sales_branch_id IS NULL;
  UPDATE public.invoices SET sales_branch_id = _branch WHERE id = doc.id;
END;
$$;

CREATE FUNCTION branch_pos_private.open_shift(_org uuid, _terminal uuid, _opening numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.pos_terminals; a public.bank_accounts; result uuid;
BEGIN
  SELECT * INTO t FROM public.pos_terminals WHERE id = _terminal AND organization_id = _org FOR UPDATE;
  IF NOT FOUND OR NOT t.is_active OR NOT branch_pos_private.can_collect(_org,t.branch_id)
    OR NOT EXISTS (SELECT FROM public.branches WHERE id = t.branch_id AND is_active) THEN
    RAISE EXCEPTION 'نقطة البيع غير متاحة' USING ERRCODE = '42501';
  END IF;
  IF _opening IS NULL OR _opening NOT BETWEEN 0 AND 9999999999999999.99 OR round(_opening,2) <> _opening THEN
    RAISE EXCEPTION 'أدخل رصيد افتتاحي صالح';
  END IF;
  SELECT * INTO STRICT a FROM public.bank_accounts WHERE id = t.cash_account_id AND organization_id = _org
    AND sales_branch_id = t.branch_id AND treasury_kind = 'cash' AND is_active FOR UPDATE;
  INSERT INTO public.pos_shifts(organization_id,terminal_id,branch_id,cash_account_id,currency,opened_by,opening_cash,opening_book)
  VALUES (_org,t.id,t.branch_id,a.id,a.currency,auth.uid(),_opening,coalesce(a.current_balance,0)) RETURNING id INTO result;
  RETURN result;
END;
$$;

CREATE FUNCTION branch_pos_private.close_shift(_org uuid, _shift uuid, _counted numeric, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.pos_shifts; book numeric; expected numeric;
BEGIN
  SELECT * INTO s FROM public.pos_shifts WHERE id = _shift AND organization_id = _org FOR UPDATE;
  IF NOT FOUND OR NOT (branch_pos_private.can_manage(_org)
      OR (s.opened_by = auth.uid() AND branch_pos_private.can_collect(_org,s.branch_id))) THEN
    RAISE EXCEPTION 'الوردية خارج الصلاحية' USING ERRCODE = '42501';
  END IF;
  IF s.closed_at IS NOT NULL THEN
    IF s.counted_cash = _counted THEN RETURN s.id; END IF;
    RAISE EXCEPTION 'الوردية مقفلة بالفعل';
  END IF;
  IF _counted IS NULL OR _counted NOT BETWEEN 0 AND 9999999999999999.99 OR round(_counted,2) <> _counted THEN
    RAISE EXCEPTION 'أدخل مبلغ العد الفعلي';
  END IF;
  SELECT coalesce(current_balance,0) INTO STRICT book FROM public.bank_accounts
  WHERE id = s.cash_account_id AND organization_id = _org FOR UPDATE;
  expected := s.opening_cash + book - s.opening_book;
  IF _counted <> expected AND nullif(btrim(_note),'') IS NULL THEN
    RAISE EXCEPTION 'أدخل ملاحظة لفرق الإقفال';
  END IF;
  UPDATE public.pos_shifts SET closed_by = auth.uid(), closed_at = clock_timestamp(),
    expected_cash = expected, counted_cash = _counted, closing_note = nullif(btrim(_note),'') WHERE id = s.id;
  RETURN s.id;
END;
$$;

CREATE FUNCTION branch_pos_private.review_shift(_org uuid, _shift uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT branch_pos_private.can_manage(_org) THEN RAISE EXCEPTION 'غير مصرح' USING ERRCODE = '42501'; END IF;
  IF nullif(btrim(_note),'') IS NULL THEN RAISE EXCEPTION 'أدخل نتيجة المراجعة'; END IF;
  UPDATE public.pos_shifts SET variance_reviewed_by = auth.uid(), variance_reviewed_at = clock_timestamp(),
    variance_review_note = btrim(_note)
  WHERE id = _shift AND organization_id = _org AND closed_at IS NOT NULL
    AND counted_cash <> expected_cash AND variance_reviewed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'فرق الإقفال غير متاح للمراجعة'; END IF;
END;
$$;

DO $$
DECLARE definition text := pg_get_functiondef(
  'public.record_customer_payment(uuid,numeric,text,numeric,text,uuid,date,text,text,text,uuid,uuid)'::regprocedure);
BEGIN
  IF strpos(definition,$sql$CASE WHEN _method='cash' AND _treasury_account_id IS NULL THEN 'cash' ELSE 'bank' END$sql$) = 0 THEN
    RAISE EXCEPTION 'Unexpected customer payment route';
  END IF;
  definition := replace(definition,
    $sql$CASE WHEN _method='cash' AND _treasury_account_id IS NULL THEN 'cash' ELSE 'bank' END$sql$,
    $sql$CASE WHEN (_method='cash' AND _treasury_account_id IS NULL) OR EXISTS (
       SELECT FROM public.bank_accounts WHERE id=_treasury_account_id AND organization_id=v_org AND treasury_kind='cash'
     ) THEN 'cash' ELSE 'bank' END$sql$);
  IF strpos(definition,'reference_number,related_invoice_id,organization_id,created_by') = 0
    OR strpos(definition,'_payment_date,_reference,_invoice_id,v_org,auth.uid()') = 0 THEN
    RAISE EXCEPTION 'Unexpected customer payment bank movement';
  END IF;
  definition := replace(definition,'reference_number,related_invoice_id,organization_id,created_by',
    'reference_number,related_invoice_id,organization_id,created_by,source_type,source_id,currency');
  definition := replace(definition,'_payment_date,_reference,_invoice_id,v_org,auth.uid()',
    $sql$_payment_date,_reference,_invoice_id,v_org,auth.uid(),'customer_payment',v_payment_id,_currency$sql$);
  EXECUTE definition;
END;
$$;

CREATE FUNCTION branch_pos_private.collect(_org uuid, _request uuid, _terminal uuid, _invoice uuid,
  _account uuid, _amount numeric, _method text, _rate numeric, _reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.pos_terminals; a public.bank_accounts; i public.invoices; s public.pos_shifts;
  prior public.pos_receipts; payment uuid; ref text := nullif(btrim(_reference),'');
BEGIN
  SELECT * INTO t FROM public.pos_terminals WHERE id = _terminal AND organization_id = _org FOR SHARE;
  IF NOT FOUND OR NOT branch_pos_private.can_collect(_org,t.branch_id) THEN
    RAISE EXCEPTION 'صلاحيات نقطة البيع لا تسمح بالتحصيل' USING ERRCODE = '42501';
  END IF;
  IF _request IS NULL OR _amount IS NULL OR _amount NOT BETWEEN .01 AND 9999999999999999.99
    OR round(_amount,2) <> _amount OR _rate IS NULL OR _rate NOT BETWEEN .000001 AND 1000000
    OR _method IS NULL OR _method NOT IN ('cash','bank_transfer','credit_card','payment_link') THEN
    RAISE EXCEPTION 'راجع المبلغ ووسيلة الدفع وسعر الصرف';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_request::text,442));
  SELECT * INTO prior FROM public.pos_receipts WHERE id = _request;
  IF FOUND THEN
    IF (prior.organization_id,prior.collected_by,prior.terminal_id,prior.invoice_id,prior.cash_account_id,
        prior.amount,prior.method,prior.exchange_rate,prior.reference)
      IS DISTINCT FROM (_org,auth.uid(),_terminal,_invoice,_account,_amount,_method,_rate,ref) THEN
      RAISE EXCEPTION 'مرجع المحاولة مستخدم لعملية مختلفة';
    END IF;
    RETURN prior.id;
  END IF;
  IF NOT t.is_active OR NOT EXISTS (SELECT FROM public.branches WHERE id = t.branch_id AND is_active) THEN
    RAISE EXCEPTION 'نقطة البيع أو الفرع موقوف';
  END IF;
  IF _method <> 'cash' AND ref IS NULL THEN RAISE EXCEPTION 'أدخل مرجع التحصيل المؤكد'; END IF;

  SELECT * INTO i FROM public.invoices WHERE id = _invoice AND organization_id = _org FOR UPDATE;
  IF NOT FOUND OR NOT branch_pos_private.can_use(_org,i.sales_branch_id)
    OR NOT public.has_org_permission(_org,'invoices_view') THEN
    RAISE EXCEPTION 'الفاتورة خارج الصلاحية' USING ERRCODE = '42501';
  END IF;
  IF i.is_demo OR coalesce(i.status,'draft') IN ('draft','cancelled','canceled','void')
    OR i.pilgrimage_b2b_agreement_id IS NOT NULL OR _amount > coalesce(i.remaining_amount,0) THEN
    RAISE EXCEPTION 'الفاتورة غير قابلة للتحصيل أو المبلغ أكبر من المستحق';
  END IF;

  SELECT * INTO s FROM public.pos_shifts
  WHERE terminal_id = t.id AND organization_id = _org AND opened_by = auth.uid() AND closed_at IS NULL FOR UPDATE;
  IF _method = 'cash' AND (s.id IS NULL OR s.cash_account_id <> _account OR t.cash_account_id <> _account) THEN
    RAISE EXCEPTION 'الكاش يحتاج وردية مفتوحة لك على خزينة نقطة البيع';
  END IF;
  SELECT * INTO a FROM public.bank_accounts WHERE id = _account AND organization_id = _org AND is_active FOR UPDATE;
  IF NOT FOUND OR a.currency IS DISTINCT FROM coalesce(i.currency,'EGP')
    OR (a.sales_branch_id IS NOT NULL AND a.sales_branch_id <> t.branch_id)
    OR NOT coalesce(CASE _method WHEN 'cash' THEN a.treasury_kind = 'cash' AND a.sales_branch_id = t.branch_id
      WHEN 'bank_transfer' THEN a.treasury_kind = 'bank'
      WHEN 'credit_card' THEN a.treasury_kind IN ('card','bank','gateway')
      WHEN 'payment_link' THEN a.treasury_kind IN ('gateway','bank','wallet') END,false) THEN
    RAISE EXCEPTION 'الخزينة غير مناسبة للفرع أو العملة أو وسيلة الدفع';
  END IF;

  payment := public.record_customer_payment(i.id,_amount,coalesce(i.currency,'EGP'),_rate,_method,a.id,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Cairo')::date,ref,NULL,'safar-pos:' || _request::text,NULL,NULL);
  -- The normal payment API also accepts a client ref. Verify the returned row
  -- before binding it to a POS receipt, even if that ref was already present.
  IF NOT EXISTS (SELECT FROM public.customer_payments p WHERE p.id = payment AND p.organization_id = _org
    AND p.invoice_id = i.id AND p.treasury_account_id = a.id AND p.created_by = auth.uid()
    AND p.amount = _amount AND p.payment_method = _method AND p.exchange_rate = _rate
    AND p.reference_number IS NOT DISTINCT FROM ref AND p.status = 'completed') THEN
    RAISE EXCEPTION 'تعذر مطابقة سجل التحصيل مع الإيصال';
  END IF;
  INSERT INTO public.pos_receipts(id,organization_id,branch_id,terminal_id,shift_id,payment_id,invoice_id,
    cash_account_id,collected_by,amount,currency,method,exchange_rate,reference,invoice_number,customer_name)
  VALUES (_request,_org,t.branch_id,t.id,s.id,payment,i.id,a.id,auth.uid(),_amount,a.currency,_method,_rate,ref,i.invoice_number,i.customer_name);
  RETURN _request;
END;
$$;

DO $$
DECLARE definition text := pg_get_functiondef('public.create_refund_request(uuid,numeric,text,numeric,uuid,text)'::regprocedure);
BEGIN
  IF strpos(definition,'ORDER BY issued_date DESC NULLS LAST,created_at DESC') = 0 THEN
    RAISE EXCEPTION 'Unexpected refund invoice selection';
  END IF;
  definition := replace(definition,'ORDER BY issued_date DESC NULLS LAST,created_at DESC',
    'ORDER BY (id = (SELECT invoice_id FROM public.customer_payments WHERE id = _source_payment_id
      AND organization_id = v_org AND booking_id = _booking_id)) DESC NULLS LAST, issued_date DESC NULLS LAST,created_at DESC');
  EXECUTE definition;
END;
$$;

CREATE FUNCTION branch_pos_private.request_refund(_org uuid, _receipt uuid, _amount numeric, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.pos_receipts; i public.invoices;
BEGIN
  SELECT * INTO r FROM public.pos_receipts WHERE id = _receipt AND organization_id = _org;
  IF NOT FOUND OR NOT branch_pos_private.can_collect(_org,r.branch_id)
    OR NOT public.has_org_permission(_org,'payments_refund') THEN
    RAISE EXCEPTION 'غير مصرح بطلب استرداد لهذا الإيصال' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO STRICT i FROM public.invoices WHERE id = r.invoice_id AND organization_id = _org;
  IF i.booking_id IS NULL THEN RAISE EXCEPTION 'الاسترداد يحتاج فاتورة مرتبطة بحجز'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > r.amount OR round(_amount,2) <> _amount
    OR nullif(btrim(_reason),'') IS NULL THEN RAISE EXCEPTION 'أدخل قيمة الاسترداد وسببه'; END IF;
  RETURN public.create_refund_request(i.booking_id,_amount,r.currency,r.exchange_rate,r.payment_id,btrim(_reason));
END;
$$;

CREATE TABLE public.pos_treasury_transfers (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  target_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  reference text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.pos_treasury_transfers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.pos_treasury_transfers TO authenticated;
GRANT ALL ON public.pos_treasury_transfers TO service_role;
CREATE POLICY pos_transfers_read ON public.pos_treasury_transfers FOR SELECT TO authenticated
  USING (branch_pos_private.can_manage(organization_id));

CREATE FUNCTION branch_pos_private.transfer_cash(_org uuid, _request uuid, _source uuid, _target uuid,
  _amount numeric, _reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.bank_accounts; b public.bank_accounts; prior public.pos_treasury_transfers;
  debit_account uuid; credit_account uuid; journal uuid; ref text := nullif(btrim(_reference),'');
BEGIN
  IF NOT branch_pos_private.can_manage(_org) OR NOT branch_pos_private.can_collect(_org,NULL) THEN
    RAISE EXCEPTION 'غير مصرح بالتحويل بين الخزائن' USING ERRCODE = '42501';
  END IF;
  IF _request IS NULL OR _source IS NULL OR _target IS NULL OR _source = _target
    OR _amount IS NULL OR _amount NOT BETWEEN .01 AND 9999999999999999.99 OR round(_amount,2) <> _amount
    OR ref IS NULL THEN RAISE EXCEPTION 'راجع الخزائن والمبلغ ومرجع التحويل'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_request::text,443));
  SELECT * INTO prior FROM public.pos_treasury_transfers WHERE id = _request;
  IF FOUND THEN
    IF (prior.organization_id,prior.created_by,prior.source_account_id,prior.target_account_id,prior.amount,prior.reference)
      IS DISTINCT FROM (_org,auth.uid(),_source,_target,_amount,ref) THEN
      RAISE EXCEPTION 'مرجع المحاولة مستخدم لتحويل مختلف';
    END IF;
    RETURN prior.id;
  END IF;
  PERFORM id FROM public.bank_accounts WHERE id IN (_source,_target) AND organization_id = _org ORDER BY id FOR UPDATE;
  SELECT * INTO STRICT a FROM public.bank_accounts WHERE id = _source AND organization_id = _org AND is_active;
  SELECT * INTO STRICT b FROM public.bank_accounts WHERE id = _target AND organization_id = _org AND is_active;
  IF a.treasury_kind <> 'cash' OR a.sales_branch_id IS NULL OR b.sales_branch_id IS NOT NULL
    OR b.treasury_kind NOT IN ('cash','bank') OR a.currency IS DISTINCT FROM b.currency
    OR coalesce(a.current_balance,0) < _amount THEN RAISE EXCEPTION 'راجع خزينة الفرع والحساب المركزي والرصيد والعملة'; END IF;

  debit_account := public.get_org_account_route(_org,CASE WHEN b.treasury_kind = 'cash' THEN 'cash' ELSE 'bank' END);
  credit_account := public.get_org_account_route(_org,'cash');
  IF debit_account IS NULL OR credit_account IS NULL THEN RAISE EXCEPTION 'توجيه حسابات النقد والبنك غير مكتمل'; END IF;

  INSERT INTO public.pos_treasury_transfers(id,organization_id,source_account_id,target_account_id,amount,currency,reference,created_by)
  VALUES (_request,_org,a.id,b.id,_amount,a.currency,ref,auth.uid());
  INSERT INTO public.journal_entries(organization_id,entry_number,entry_date,reference_type,reference_id,
    description,total_debit,total_credit,status,created_by,currency,source_type,source_id,posted_at,is_locked,auto_generated)
  VALUES (_org,public._next_entry_number(_org),CURRENT_DATE,'treasury_transfer',_request,'تحويل خزينة داخلي',
    _amount,_amount,'posted',auth.uid(),a.currency,'treasury_transfer',_request,now(),false,true) RETURNING id INTO journal;
  INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit,credit,description,line_order)
  VALUES (journal,debit_account,_amount,0,'الحساب المركزي',1),(journal,credit_account,0,_amount,'خزينة الفرع',2);
  INSERT INTO public.bank_account_transactions(bank_account_id,transaction_type,amount,description,transaction_date,
    reference_number,organization_id,created_by,source_type,source_id,currency)
  VALUES (a.id,'withdrawal',_amount,'تحويل داخلي إلى الإدارة',CURRENT_DATE,ref,_org,auth.uid(),'treasury_transfer',_request,a.currency),
    (b.id,'deposit',_amount,'تحويل داخلي من فرع',CURRENT_DATE,ref,_org,auth.uid(),'treasury_transfer',_request,a.currency);
  RETURN _request;
END;
$$;

-- New postings use the branch's chosen cost center. Historical entries stay
-- intact, including locked journals and documents without known attribution.
CREATE FUNCTION branch_pos_private.protect_receipt_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT FROM public.pos_receipts WHERE payment_id = OLD.id) AND
    (OLD.organization_id,OLD.invoice_id,OLD.booking_id,OLD.treasury_account_id,OLD.amount,OLD.currency,
      OLD.exchange_rate,OLD.payment_method,OLD.reference_number,OLD.status)
    IS DISTINCT FROM
    (NEW.organization_id,NEW.invoice_id,NEW.booking_id,NEW.treasury_account_id,NEW.amount,NEW.currency,
      NEW.exchange_rate,NEW.payment_method,NEW.reference_number,NEW.status) THEN
    RAISE EXCEPTION 'استخدم الاسترداد لتسوية دفعة صدر لها إيصال';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pos_protect_receipt_payment BEFORE UPDATE ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION branch_pos_private.protect_receipt_payment();

CREATE FUNCTION branch_pos_private.protect_treasury_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (OLD.source_type = 'treasury_transfer'
      AND EXISTS (SELECT FROM public.pos_treasury_transfers WHERE id = OLD.source_id AND organization_id = OLD.organization_id))
    OR (OLD.source_type = 'customer_payment'
      AND EXISTS (SELECT FROM public.pos_receipts WHERE payment_id = OLD.source_id AND organization_id = OLD.organization_id)) THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'حركات الخزينة المرتبطة بإيصال أو تحويل لا تُحذف'; END IF;
    IF (OLD.bank_account_id,OLD.organization_id,OLD.amount,OLD.transaction_type,OLD.transaction_date,OLD.source_type,OLD.source_id)
      IS DISTINCT FROM (NEW.bank_account_id,NEW.organization_id,NEW.amount,NEW.transaction_type,NEW.transaction_date,NEW.source_type,NEW.source_id) THEN
      RAISE EXCEPTION 'حركات الخزينة المرتبطة بإيصال أو تحويل لا تتغير';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER pos_protect_treasury_movement BEFORE UPDATE OR DELETE ON public.bank_account_transactions
FOR EACH ROW EXECUTE FUNCTION branch_pos_private.protect_treasury_movement();

CREATE FUNCTION branch_pos_private.attribute_journal_line()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.journal_entries; branch uuid;
BEGIN
  IF NEW.cost_center_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT * INTO e FROM public.journal_entries WHERE id = NEW.journal_entry_id;
  IF e.source_type IN ('invoice','legacy_invoice_receipt') THEN
    SELECT sales_branch_id INTO branch FROM public.invoices WHERE id = e.source_id AND organization_id = e.organization_id;
  END IF;
  IF branch IS NULL AND e.booking_id IS NOT NULL THEN
    SELECT sales_branch_id INTO branch FROM public.bookings WHERE id = e.booking_id AND organization_id = e.organization_id;
  END IF;
  IF branch IS NULL AND e.source_type = 'expense' THEN
    SELECT a.sales_branch_id INTO branch FROM public.expense_transactions x
    JOIN public.bank_accounts a ON a.id = x.bank_account_id AND a.organization_id = e.organization_id
    WHERE x.id = e.source_id AND x.organization_id = e.organization_id;
  END IF;
  SELECT pos_cost_center_id INTO NEW.cost_center_id FROM public.branches
  WHERE id = branch AND organization_id = e.organization_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pos_attribute_journal_line BEFORE INSERT ON public.journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION branch_pos_private.attribute_journal_line();

CREATE FUNCTION branch_pos_private.whatsapp_quote_branch(_org uuid, _conversation uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE branch uuid; channel uuid; allowed boolean;
BEGIN
  IF NOT public.has_org_permission(_org,'whatsapp_view') OR NOT public.has_org_permission(_org,'quotes_create') THEN RETURN NULL; END IF;
  SELECT b.id,s.id INTO branch,channel FROM public.whatsapp_conversations c
  JOIN public.whatsapp_settings s ON s.id=c.whatsapp_settings_id AND s.organization_id=c.organization_id
  JOIN public.branches b ON b.id::text=to_jsonb(s)->>'branch_id' AND b.organization_id=c.organization_id AND b.is_active
  WHERE c.id=_conversation AND c.organization_id=_org;
  IF branch IS NULL OR NOT branch_pos_private.can_use(_org,branch) THEN RETURN NULL; END IF;
  IF to_regprocedure('wa_branch_private.can_access_inbox(uuid,uuid)') IS NULL THEN RETURN NULL; END IF;
  EXECUTE 'SELECT wa_branch_private.can_access_inbox($1,$2)' INTO allowed USING _org,channel;
  RETURN CASE WHEN allowed THEN branch END;
END;
$$;

CREATE FUNCTION branch_pos_private.accounts(_org uuid)
RETURNS TABLE(id uuid, account_name text, currency text, treasury_kind text, sales_branch_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.id,a.account_name,a.currency,a.treasury_kind,a.sales_branch_id FROM public.bank_accounts a
  WHERE a.organization_id=_org AND a.is_active AND public.has_org_permission(_org,'payments_view')
    AND (
      branch_pos_private.can_use(_org,a.sales_branch_id)
      OR (a.sales_branch_id IS NULL AND a.treasury_kind IN ('bank','card','wallet','gateway')
        AND EXISTS (SELECT FROM public.pos_terminals t WHERE t.organization_id=_org AND t.is_active
          AND branch_pos_private.can_use(_org,t.branch_id)))
    )
  ORDER BY a.account_name,a.id;
$$;

CREATE FUNCTION branch_pos_private.invoices(_org uuid, _search text)
RETURNS TABLE(id uuid, invoice_number text, customer_name text, booking_number text,
  sales_branch_id uuid, currency text, final_amount numeric, remaining_amount numeric, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT i.id,i.invoice_number,i.customer_name,b.booking_number,i.sales_branch_id,coalesce(i.currency,'EGP'),
    i.final_amount,i.remaining_amount,i.status
  FROM public.invoices i LEFT JOIN public.bookings b ON b.id=i.booking_id AND b.organization_id=i.organization_id
  WHERE i.organization_id=_org AND NOT i.is_demo AND public.has_org_permission(_org,'invoices_view')
    AND branch_pos_private.can_use(_org,i.sales_branch_id)
    AND (nullif(btrim(_search),'') IS NULL OR strpos(lower(i.invoice_number),lower(btrim(_search))) > 0
      OR strpos(lower(coalesce(i.customer_name,'')),lower(btrim(_search))) > 0
      OR strpos(lower(coalesce(b.booking_number,'')),lower(btrim(_search))) > 0)
  ORDER BY i.created_at DESC NULLS LAST, i.id
  LIMIT 50;
$$;

CREATE FUNCTION branch_pos_private.sales_report(_org uuid, _from date, _to date)
RETURNS TABLE(branch_id uuid, currency text, booking_count bigint, sales numeric, outstanding numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH bookings AS (
    SELECT b.sales_branch_id AS branch,coalesce(b.currency,'EGP') AS curr,count(*) AS qty,coalesce(sum(b.selling_price),0) AS sales
    FROM public.bookings b WHERE b.organization_id=_org AND NOT b.is_demo
      AND b.created_at >= (_from::timestamp AT TIME ZONE 'Africa/Cairo')
      AND b.created_at < ((_to+1)::timestamp AT TIME ZONE 'Africa/Cairo')
      AND coalesce(b.status,'pending') NOT IN ('cancelled','canceled','void')
    GROUP BY 1,2
  ), invoices AS (
    SELECT i.sales_branch_id AS branch,coalesce(i.currency,'EGP') AS curr,coalesce(sum(i.remaining_amount),0) AS due
    FROM public.invoices i WHERE i.organization_id=_org AND NOT i.is_demo
      AND coalesce(i.issued_date,i.created_at::date) BETWEEN _from AND _to
      AND coalesce(i.status,'draft') NOT IN ('draft','cancelled','canceled','void')
    GROUP BY 1,2
  )
  SELECT x.branch,x.curr,sum(x.qty)::bigint,sum(x.sales),sum(x.due) FROM (
    SELECT b.branch,b.curr,b.qty,b.sales,0::numeric AS due FROM bookings b
    UNION ALL SELECT i.branch,i.curr,0,0,i.due FROM invoices i
  ) x
  WHERE branch_pos_private.can_use(_org,x.branch) AND public.has_org_permission(_org,'financial_view')
  GROUP BY 1,2 ORDER BY 1,2;
$$;

CREATE FUNCTION branch_pos_private.profit_report(_org uuid, _from date, _to date)
RETURNS TABLE(branch_id uuid, currency text, revenue numeric, expenses numeric, profit numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT b.id,coalesce(e.currency,'EGP'),
    sum(CASE WHEN a.account_type::text='revenue' THEN l.credit-l.debit ELSE 0 END) AS revenue,
    sum(CASE WHEN a.account_type::text IN ('expense','cost_of_sales','cost_of_revenue','cogs') THEN l.debit-l.credit ELSE 0 END) AS expenses,
    sum(CASE WHEN a.account_type::text IN ('revenue','expense','cost_of_sales','cost_of_revenue','cogs') THEN l.credit-l.debit ELSE 0 END) AS profit
  FROM public.branches b JOIN public.journal_entry_lines l ON l.cost_center_id=b.pos_cost_center_id
  JOIN public.journal_entries e ON e.id=l.journal_entry_id AND e.organization_id=b.organization_id
  JOIN public.chart_of_accounts a ON a.id=l.account_id AND a.organization_id=b.organization_id
  WHERE b.organization_id=_org AND e.status='posted' AND e.entry_date BETWEEN _from AND _to
    AND branch_pos_private.can_use(_org,b.id) AND public.has_org_permission(_org,'financial_view')
  GROUP BY 1,2 ORDER BY 1,2;
$$;

CREATE FUNCTION branch_pos_private.collection_report(_org uuid, _from date, _to date)
RETURNS TABLE(branch_id uuid, account_name text, cashier text, method text, currency text, collected numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.branch_id,a.account_name,coalesce(p.full_name,r.collected_by::text),r.method,r.currency,sum(r.amount)
  FROM public.pos_receipts r JOIN public.bank_accounts a ON a.id=r.cash_account_id AND a.organization_id=r.organization_id
  LEFT JOIN public.profiles p ON p.id=r.collected_by
  WHERE r.organization_id=_org AND r.created_at >= (_from::timestamp AT TIME ZONE 'Africa/Cairo')
    AND r.created_at < ((_to+1)::timestamp AT TIME ZONE 'Africa/Cairo')
    AND branch_pos_private.can_use(_org,r.branch_id) AND public.has_org_permission(_org,'financial_view')
  GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5;
$$;

-- Public RPCs run as the caller. Private write functions validate tenant,
-- role and branch before taking locks or using canonical finance operations.
CREATE FUNCTION public.pos_save_terminal(_org uuid,_id uuid,_branch uuid,_account uuid,_name text,_active boolean)
RETURNS uuid LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.save_terminal(_org,_id,_branch,_account,_name,_active) $$;
CREATE FUNCTION public.pos_set_member_branch(_org uuid,_member uuid,_branch uuid)
RETURNS void LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.set_member_branch(_org,_member,_branch) $$;
CREATE FUNCTION public.pos_set_document_branch(_org uuid,_invoice uuid,_branch uuid)
RETURNS void LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.set_document_branch(_org,_invoice,_branch) $$;
CREATE FUNCTION public.pos_open_shift(_org uuid,_terminal uuid,_opening numeric)
RETURNS uuid LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.open_shift(_org,_terminal,_opening) $$;
CREATE FUNCTION public.pos_close_shift(_org uuid,_shift uuid,_counted numeric,_note text)
RETURNS uuid LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.close_shift(_org,_shift,_counted,_note) $$;
CREATE FUNCTION public.pos_review_shift(_org uuid,_shift uuid,_note text)
RETURNS void LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.review_shift(_org,_shift,_note) $$;
CREATE FUNCTION public.pos_collect(_org uuid,_request uuid,_terminal uuid,_invoice uuid,_account uuid,_amount numeric,_method text,_rate numeric,_reference text)
RETURNS uuid LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.collect(_org,_request,_terminal,_invoice,_account,_amount,_method,_rate,_reference) $$;
CREATE FUNCTION public.pos_request_refund(_org uuid,_receipt uuid,_amount numeric,_reason text)
RETURNS uuid LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.request_refund(_org,_receipt,_amount,_reason) $$;
CREATE FUNCTION public.pos_transfer_cash(_org uuid,_request uuid,_source uuid,_target uuid,_amount numeric,_reference text)
RETURNS uuid LANGUAGE sql SET search_path = '' AS $$ SELECT branch_pos_private.transfer_cash(_org,_request,_source,_target,_amount,_reference) $$;
CREATE FUNCTION public.pos_whatsapp_quote_branch(_org uuid,_conversation uuid)
RETURNS uuid LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT branch_pos_private.whatsapp_quote_branch(_org,_conversation) $$;
CREATE FUNCTION public.pos_accounts(_org uuid)
RETURNS TABLE(id uuid,account_name text,currency text,treasury_kind text,sales_branch_id uuid)
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT * FROM branch_pos_private.accounts(_org) $$;
CREATE FUNCTION public.pos_find_invoices(_org uuid,_search text)
RETURNS TABLE(id uuid,invoice_number text,customer_name text,booking_number text,sales_branch_id uuid,currency text,
  final_amount numeric,remaining_amount numeric,status text)
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT * FROM branch_pos_private.invoices(_org,_search) $$;
CREATE FUNCTION public.pos_sales_report(_org uuid,_from date,_to date)
RETURNS TABLE(branch_id uuid,currency text,booking_count bigint,sales numeric,outstanding numeric)
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT * FROM branch_pos_private.sales_report(_org,_from,_to) $$;
CREATE FUNCTION public.pos_profit_report(_org uuid,_from date,_to date)
RETURNS TABLE(branch_id uuid,currency text,revenue numeric,expenses numeric,profit numeric)
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT * FROM branch_pos_private.profit_report(_org,_from,_to) $$;
CREATE FUNCTION public.pos_collection_report(_org uuid,_from date,_to date)
RETURNS TABLE(branch_id uuid,account_name text,cashier text,method text,currency text,collected numeric)
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT * FROM branch_pos_private.collection_report(_org,_from,_to) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA branch_pos_private FROM PUBLIC, anon, authenticated;
DO $$
DECLARE routine regprocedure;
BEGIN
  FOR routine IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE (n.nspname='public' AND p.proname IN ('pos_save_terminal','pos_set_member_branch','pos_set_document_branch',
      'pos_open_shift','pos_close_shift','pos_review_shift','pos_collect','pos_request_refund','pos_transfer_cash',
      'pos_find_invoices','pos_accounts','pos_whatsapp_quote_branch','pos_sales_report','pos_profit_report','pos_collection_report'))
      OR (n.nspname='branch_pos_private' AND p.prorettype <> 'pg_catalog.trigger'::regtype)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',routine);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',routine);
  END LOOP;
END;
$$;
COMMIT;
