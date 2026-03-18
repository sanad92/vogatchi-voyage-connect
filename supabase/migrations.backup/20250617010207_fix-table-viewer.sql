
-- إنشاء دالة لجلب بيانات الجداول بطريقة ديناميكية
CREATE OR REPLACE FUNCTION public.get_table_data(
  table_name TEXT,
  limit_count INTEGER DEFAULT 30
) RETURNS TABLE(result JSONB) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  query_text TEXT;
BEGIN
  -- التحقق من أن اسم الجدول صالح (لمنع SQL injection)
  IF table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;
  
  -- بناء الاستعلام
  query_text := format('SELECT to_jsonb(t.*) FROM %I t LIMIT %s', table_name, limit_count);
  
  -- تنفيذ الاستعلام
  RETURN QUERY EXECUTE query_text;
  
EXCEPTION
  WHEN undefined_table THEN
    RAISE EXCEPTION 'Table does not exist: %', table_name;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error querying table %: %', table_name, SQLERRM;
END;
$$;
