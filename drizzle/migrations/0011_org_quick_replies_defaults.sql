CREATE OR REPLACE FUNCTION public._seed_quick_replies_for_org(_org_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n text; c integer := 0;
BEGIN
  SELECT name INTO n FROM organizations WHERE id=_org_id;
  IF n IS NULL THEN RETURN 0; END IF;
  INSERT INTO quick_replies(organization_id,title,content,category,is_global)
  SELECT _org_id, t.title, replace(t.content,'{company}',n), t.cat, true
  FROM (VALUES
   ('ترحيب بالعملاء','أهلًا وسهلًا بكم في {company} 👋'||chr(10)||'سعداء بتواصلكم معنا، وفريق {company} متواجد لخدمتكم. كيف يمكننا مساعدتكم اليوم؟','greeting'),
   ('طلب تفاصيل الرحلة','يسعدنا مساعدتكم في تجهيز رحلتكم ✈️'||chr(10)||'نرجو تزويدنا بالتفاصيل التالية:'||chr(10)||'📍 الوجهة'||chr(10)||'📅 تاريخ السفر والعودة'||chr(10)||'👥 عدد المسافرين'||chr(10)||'💰 الميزانية التقريبية','inquiry'),
   ('طلب حجز فندق','بالتأكيد، يسعدنا مساعدتكم في حجز الفندق 🏨'||chr(10)||'نرجو إرسال:'||chr(10)||'📍 المدينة'||chr(10)||'📅 تاريخ الدخول والخروج'||chr(10)||'👥 عدد الأفراد والغرف','inquiry'),
   ('جاري البحث','شكرًا لتزويدنا بالتفاصيل 🤍'||chr(10)||'فريق {company} يعمل حاليًا على مراجعة أفضل الخيارات المناسبة لكم، وسنعود إليكم قريبًا.','followup'),
   ('جاري تجهيز العرض','تم استلام طلبكم بنجاح ✅'||chr(10)||'نعمل حاليًا على تجهيز العرض المناسب لكم، وسيصلكم خلال وقت قصير.','followup'),
   ('إرسال العرض','يسعدنا إرسال العرض المقترح لرحلتكم ✈️'||chr(10)||'تم اختيار الخيارات بعناية لتناسب طلبكم. لأي استفسار، فريق {company} في خدمتكم.','quote'),
   ('غلق الشات لعدم الرد','لم نتلقَّ ردًا منكم حتى الآن، لذلك سيتم إغلاق المحادثة مؤقتًا.'||chr(10)||'يسعد فريق {company} بخدمتكم في أي وقت عند تواصلكم معنا مجددًا.','closing')
  ) AS t(title,content,cat)
  WHERE NOT EXISTS (SELECT 1 FROM quick_replies q WHERE q.organization_id=_org_id AND q.title=t.title);
  GET DIAGNOSTICS c = ROW_COUNT;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public._seed_quick_replies_for_org(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.restore_default_quick_replies(_org_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.is_platform_admin(auth.uid()) OR EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=auth.uid() AND om.organization_id=_org_id AND om.is_active AND om.role IN ('owner','admin','manager'))) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE='42501';
  END IF;
  RETURN public._seed_quick_replies_for_org(_org_id);
END $$;
REVOKE ALL ON FUNCTION public.restore_default_quick_replies(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_default_quick_replies(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._trg_seed_org_quick_replies()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  BEGIN PERFORM public._seed_quick_replies_for_org(NEW.id);
  EXCEPTION WHEN others THEN NULL; END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_seed_org_quick_replies ON public.organizations;
CREATE TRIGGER trg_seed_org_quick_replies AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public._trg_seed_org_quick_replies();

INSERT INTO public.quick_replies(organization_id,title,content,category,is_global)
SELECT NULL,NULL,NULL,NULL,NULL WHERE false;
SELECT public._seed_quick_replies_for_org(o.id) FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.quick_replies q WHERE q.organization_id=o.id);