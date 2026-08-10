DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public' AND p.proname='sop_publish_pricing';

  def := replace(def,
    'SET status = CASE WHEN status IN (''quoted'',''requoted'',''recheck'') THEN ''requoted'' ELSE ''quoted'' END',
    'SET status = (CASE WHEN status IN (''quoted'',''requoted'',''recheck'') THEN ''requoted'' ELSE ''quoted'' END)::public.sop_pricing_status');

  EXECUTE def;
END $$;