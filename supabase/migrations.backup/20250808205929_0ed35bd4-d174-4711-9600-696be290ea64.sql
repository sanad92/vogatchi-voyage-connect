-- 1) Phone normalization helper
CREATE OR REPLACE FUNCTION public.normalize_phone_sql(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;
  -- keep only digits
  digits := regexp_replace(p_phone, '[^0-9]+', '', 'g');

  -- remove leading 00 (international prefix)
  IF digits LIKE '00%' THEN
    digits := substr(digits, 3);
  END IF;

  -- remove single leading 0
  IF digits LIKE '0%' THEN
    digits := substr(digits, 2);
  END IF;

  RETURN digits;
END;
$$;

-- 2) RPC to get duplicate customers by normalized phone or email
-- Returns grouped duplicates with aggregated customer rows
CREATE OR REPLACE FUNCTION public.get_duplicate_customers(
  p_search text DEFAULT NULL,
  p_type text DEFAULT NULL,            -- 'phone' | 'email' | NULL (both)
  p_min_count int DEFAULT 2,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  group_type text,
  key text,
  customers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH c AS (
    SELECT 
      id, name, phone, email, created_at,
      public.normalize_phone_sql(phone) AS norm_phone,
      lower(trim(email)) AS norm_email
    FROM public.customers
  ), phone_groups AS (
    SELECT 
      'phone'::text AS group_type,
      norm_phone AS key,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'phone', phone,
          'email', email,
          'created_at', created_at
        )
        ORDER BY created_at ASC
      ) AS customers,
      COUNT(*) AS cnt
    FROM c
    WHERE norm_phone IS NOT NULL AND norm_phone <> ''
    GROUP BY norm_phone
    HAVING COUNT(*) >= p_min_count
  ), email_groups AS (
    SELECT 
      'email'::text AS group_type,
      norm_email AS key,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'phone', phone,
          'email', email,
          'created_at', created_at
        )
        ORDER BY created_at ASC
      ) AS customers,
      COUNT(*) AS cnt
    FROM c
    WHERE norm_email IS NOT NULL AND norm_email <> ''
    GROUP BY norm_email
    HAVING COUNT(*) >= p_min_count
  ), all_groups AS (
    SELECT * FROM phone_groups
    UNION ALL
    SELECT * FROM email_groups
  ), filtered AS (
    SELECT ag.*
    FROM all_groups ag
    WHERE (p_type IS NULL OR ag.group_type = p_type)
      AND (
        p_search IS NULL OR EXISTS (
          SELECT 1 FROM c 
          WHERE (
            (ag.group_type = 'phone' AND c.norm_phone = ag.key) OR
            (ag.group_type = 'email' AND c.norm_email = ag.key)
          )
          AND (
            c.name ILIKE '%' || p_search || '%'
            OR c.phone ILIKE '%' || p_search || '%'
            OR c.email ILIKE '%' || p_search || '%'
          )
        )
      )
  )
  SELECT group_type, key, customers
  FROM filtered
  ORDER BY jsonb_array_length(customers) DESC, key ASC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

-- 3) Enable RLS and add policies for sensitive/finance tables
-- whatsapp_settings (highly sensitive)
ALTER TABLE IF EXISTS public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'whatsapp_settings' AND policyname = 'whatsapp_settings: manage by super_admin'
  ) THEN
    CREATE POLICY "whatsapp_settings: manage by super_admin"
    ON public.whatsapp_settings
    FOR ALL
    USING (has_role(auth.uid(), 'super_admin'::user_role))
    WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));
  END IF;
END $$;

-- bank_accounts
ALTER TABLE IF EXISTS public.bank_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bank_accounts' AND policyname = 'bank_accounts: view by finance roles'
  ) THEN
    CREATE POLICY "bank_accounts: view by finance roles"
    ON public.bank_accounts
    FOR SELECT
    USING (
      has_role(auth.uid(), 'super_admin'::user_role) OR 
      has_role(auth.uid(), 'admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bank_accounts' AND policyname = 'bank_accounts: manage by super_admin'
  ) THEN
    CREATE POLICY "bank_accounts: manage by super_admin"
    ON public.bank_accounts
    FOR ALL
    USING (has_role(auth.uid(), 'super_admin'::user_role))
    WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));
  END IF;
END $$;

-- bank_account_transactions
ALTER TABLE IF EXISTS public.bank_account_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bank_account_transactions' AND policyname = 'bank_account_transactions: view by finance roles'
  ) THEN
    CREATE POLICY "bank_account_transactions: view by finance roles"
    ON public.bank_account_transactions
    FOR SELECT
    USING (
      has_role(auth.uid(), 'super_admin'::user_role) OR 
      has_role(auth.uid(), 'admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bank_account_transactions' AND policyname = 'bank_account_transactions: manage by finance roles'
  ) THEN
    CREATE POLICY "bank_account_transactions: manage by finance roles"
    ON public.bank_account_transactions
    FOR ALL
    USING (
      has_role(auth.uid(), 'super_admin'::user_role) OR 
      has_role(auth.uid(), 'admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)
    )
    WITH CHECK (
      has_role(auth.uid(), 'super_admin'::user_role) OR 
      has_role(auth.uid(), 'admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)
    );
  END IF;
END $$;

-- exchange_rates
ALTER TABLE IF EXISTS public.exchange_rates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'exchange_rates' AND policyname = 'exchange_rates: read by authenticated'
  ) THEN
    CREATE POLICY "exchange_rates: read by authenticated"
    ON public.exchange_rates
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'exchange_rates' AND policyname = 'exchange_rates: manage by finance roles'
  ) THEN
    CREATE POLICY "exchange_rates: manage by finance roles"
    ON public.exchange_rates
    FOR ALL
    USING (
      has_role(auth.uid(), 'super_admin'::user_role) OR 
      has_role(auth.uid(), 'admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)
    )
    WITH CHECK (
      has_role(auth.uid(), 'super_admin'::user_role) OR 
      has_role(auth.uid(), 'admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)
    );
  END IF;
END $$;