DO $do$
DECLARE fn text; src text; newsrc text;
BEGIN
  FOR fn IN SELECT p.oid::regprocedure::text
            FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname IN ('sop_complete_handover','sop_publish_pricing','sop_validate_transition')
  LOOP
    src := pg_get_functiondef(fn::regprocedure);
    newsrc := regexp_replace(src,
      '(viol|missing)\s*:=\s*\1\s*\|\|\s*''([a-zA-Z0-9_]+)''',
      '\1 := \1 || ''\2''::text', 'g');
    IF newsrc <> src THEN
      EXECUTE newsrc;
    END IF;
  END LOOP;
END $do$;