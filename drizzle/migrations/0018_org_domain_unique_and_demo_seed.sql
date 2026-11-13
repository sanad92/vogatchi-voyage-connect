CREATE OR REPLACE FUNCTION public._guard_org_email_domain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d text;
BEGIN
  IF NEW.email IS NULL OR auth.uid() IS NULL OR public.is_platform_admin(auth.uid()) THEN RETURN NEW; END IF;
  d := lower(split_part(trim(NEW.email),'@',2));
  IF d <> '' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id <> NEW.id AND lower(split_part(trim(o.email),'@',2)) = d) THEN
    RAISE EXCEPTION 'يوجد بالفعل حساب شركة مسجل بنطاق البريد @%. اطلب من مدير شركتك دعوتك بدلاً من إنشاء حساب جديد.', d USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_org_email_domain ON public.organizations;
CREATE TRIGGER trg_guard_org_email_domain BEFORE INSERT OR UPDATE OF email ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public._guard_org_email_domain();

CREATE OR REPLACE FUNCTION public._trg_seed_org_demo_data()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  BEGIN
    INSERT INTO public.customers (organization_id, name, phone, email, is_demo) VALUES
      (NEW.id,'أحمد محمود (تجريبي)','+201000000001','ahmed.demo@example.com',true),
      (NEW.id,'سارة علي (تجريبي)','+201000000002','sara.demo@example.com',true),
      (NEW.id,'خالد إبراهيم (تجريبي)','+966500000003','khaled.demo@example.com',true),
      (NEW.id,'منى حسن (تجريبي)','+201000000004','mona.demo@example.com',true),
      (NEW.id,'عمر يوسف (تجريبي)','+971500000005','omar.demo@example.com',true);
    INSERT INTO public.suppliers (organization_id, name, phone, email, supplier_type, type, notes, is_demo) VALUES
      (NEW.id,'فندق النيل الفاخر (تجريبي)','+20220000001','nile.demo@example.com','hotel','hotel','بيانات تجريبية',true),
      (NEW.id,'شركة طيران تجريبية','+20220000002','air.demo@example.com','flight','flight','بيانات تجريبية',true),
      (NEW.id,'ليموزين النقل (تجريبي)','+20220000003','transfer.demo@example.com','transport','transport','بيانات تجريبية',true);
    UPDATE public.organizations SET has_demo_data = true WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'demo seed skipped for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_seed_org_demo_data ON public.organizations;
CREATE TRIGGER trg_seed_org_demo_data AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public._trg_seed_org_demo_data();
REVOKE ALL ON FUNCTION public._guard_org_email_domain(), public._trg_seed_org_demo_data() FROM PUBLIC, anon, authenticated;