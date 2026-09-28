CREATE OR REPLACE FUNCTION public.guard_quote_review_insert() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('sent','accepted') AND NEW.review_approved_at IS NULL THEN
    RAISE EXCEPTION 'احفظ العرض كمسودة ثم اعتمده قبل الإرسال' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_quote_review_insert ON public.quotes;
CREATE TRIGGER guard_quote_review_insert BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.guard_quote_review_insert();