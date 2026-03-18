-- Strengthen logical organization identity constraints without changing table structure
-- 1) Prevent duplicate organization names inside the same email scope (case-insensitive)
-- 2) Keep global slug uniqueness unchanged

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_unique_name_email
ON public.organizations (lower(name), lower(COALESCE(email, '')));
