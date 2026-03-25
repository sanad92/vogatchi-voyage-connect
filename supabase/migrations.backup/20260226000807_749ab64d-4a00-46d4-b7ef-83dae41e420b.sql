
-- Add onboarding_completed flag to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
