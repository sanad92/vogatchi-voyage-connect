
-- Add demo data flag to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS has_demo_data boolean NOT NULL DEFAULT false;
