# Release Readiness Report

Date: 2026-03-24
Branch: `seif-work`
Target release: 2026-04-04

## Audit Summary

- Active frontend stack: Vite + React 18 + TypeScript + React Router + TanStack Query + Tailwind + shadcn/ui.
- Active backend stack: Supabase Auth, PostgREST/RPC, SQL migrations, Edge Functions in `supabase/functions/`.
- Supabase structure:
  - Schema history: `supabase/migrations/`
  - Edge APIs: `supabase/functions/`
  - Browser client: `src/integrations/supabase/client.ts`
- Current SaaS entry points:
  - `src/main.tsx`
  - `src/App.tsx`
  - `src/hooks/useOptimizedAuth.tsx`
  - `src/contexts/OrganizationContext.tsx`
  - `src/contexts/SubscriptionContext.tsx`
  - `supabase/functions/create-organization-onboarding/index.ts`
  - `supabase/functions/create-payment/index.ts`
- Request flow:
  1. Frontend route enters through `src/App.tsx`.
  2. Browser auth/session runs through Supabase Auth.
  3. Frontend reads and writes tenant data through PostgREST and RPCs.
  4. Sensitive writes go through Edge Functions.
  5. Edge Functions call Supabase tables/RPCs with anon or service-role credentials.

## Changes Made

### Env and secrets

- Stopped tracking `.env`.
- Added `.env`, `.env.local`, `.env.e2e`, and local env variants to `.gitignore`.
- Added `.env.example` with browser-safe placeholders.
- Replaced real-looking values in `.env.e2e.example` with placeholders.
- Rewrote `README.md` so required frontend env vars, Edge Function secrets, install/build steps, and test setup are documented.

### Package manager

- Standardized on npm.
- Added `"packageManager": "npm@10.9.3"` to `package.json`.
- Removed `bun.lock` and `bun.lockb`.
- Regenerated `package-lock.json`.
- Kept Vite on a compatible version line so `npm ci` and `npm run build` both complete.

### Supabase readiness

- Added `supabase/migrations/20260324113000_release_readiness_onboarding_and_subscriptions.sql`.
- Seeded default subscription plans when missing.
- Fixed `count_org_bookings_this_month(...)` so hotel bookings are counted again.
- Restored owner-membership auto insert.
- Restored trial-subscription auto insert.
- Replaced broken onboarding RPC bodies with working inserts for:
  - `organizations`
  - `organization_members`
  - `subscriptions`
- Rewrote `check_subscription_limits(...)` without the broken `record` assignment pattern that causes runtime 500s.
- Confirmed org/subscription tables already have RLS enabled in migrations; no extra release-blocking RLS toggle was missing on those core tenant tables.

### Edge functions and CORS

- Restored `supabase/functions/process-email-queue/index.ts` to the correct queue-processor logic.
- Fixed `supabase/functions/create-payment/index.ts` to use `SUPABASE_ANON_KEY` for auth validation instead of the wrong `SERVICE_ROLE_KEY` env name.
- Added `Access-Control-Allow-Methods: POST, OPTIONS` and explicit `OPTIONS 200` handling to the frontend-invoked functions:
  - `admin-user-management`
  - `confirm-payment`
  - `create-payment`
  - `create-payment-intent`
  - `generate-demo-data`
  - `process-email-queue`
  - `send-booking-confirmation`
  - `send-welcome-email`

### Testing

- Added `.env.e2e` auto-loading in Playwright config.
- Increased Playwright timeout for real auth/onboarding flows.
- Added resilient auth helpers that:
  - use configured admin credentials when they work
  - fall back to provisioning a fresh signup/org flow for smoke coverage
- Added `tests/e2e/release-smoke.spec.ts` for:
  - signup -> create organization -> dashboard

## How To Run

```sh
npm ci
npm run dev
```

Build:

```sh
npm run build
```

Playwright:

```sh
npx playwright test tests/e2e/release-smoke.spec.ts tests/e2e/auth.spec.ts tests/e2e/protected-routes.spec.ts tests/e2e/subscription-onboarding.spec.ts --project=chromium
npx playwright test tests/e2e/smoke.spec.ts --project=chromium
npx playwright test tests/e2e/admin-routes.spec.ts tests/e2e/platform-admin-routes.spec.ts --project=chromium
```

## Verification Run

### Local commands

- `npm ci`: passed
- `npm run build`: passed
- `npm audit --json`: 1 high-severity direct dependency issue in `xlsx`

### Playwright results against the live deployed app

- `auth + protected + subscription + release smoke`: 4 passed, 3 failed
- `core module smoke`: 0 passed, 10 failed
- `admin + platform admin`: 0 passed, 7 failed

### What failed and why

- Authenticated non-admin tests now get through login and protected routing, but the live app still emits backend 400/500s after login.
- Core module route checks all fail because the same 500 is triggered across protected pages.
- Admin/platform-admin tests fail earlier because the configured `.env.e2e` admin credentials are invalid.

### Live request failures captured during smoke runs

- `500 https://gvozalurfthzxpuasplo.supabase.co/rest/v1/rpc/check_subscription_limits`
- `400 https://gvozalurfthzxpuasplo.supabase.co/rest/v1/customer_follow_ups?...profiles!customer_follow_ups_assigned_to_fkey...`

### Live CORS preflight check

- `OPTIONS https://gvozalurfthzxpuasplo.supabase.co/functions/v1/create-organization-onboarding`: `200 OK`
- `OPTIONS https://gvozalurfthzxpuasplo.supabase.co/functions/v1/send-welcome-email`: `200 OK`
- Current deployed responses include `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers`, but they do not currently return `Access-Control-Allow-Methods`.
- Repo code has been patched to add the missing methods header for the next deploy.

## Open Issues Blocking A Clean Release

1. The deployed app is still hitting `check_subscription_limits(...)` 500s.
2. The deployed app is still querying `customer_follow_ups_assigned_to_fkey`, which does not match the current repo state and indicates a DB or deployment mismatch.
3. The live deployment is using Supabase project `gvozalurfthzxpuasplo`, while the local repo `.env` points at a different project. Release prep is currently split across two environments.
4. Shared admin credentials in `.env.e2e` are invalid, so admin/platform-admin smoke coverage is blocked until valid credentials are supplied.
5. Fresh signup -> create-organization can still end up back on `/onboarding` in the live deployment instead of staying on `/dashboard`.
6. `xlsx` remains a high-severity dependency risk with no automatic npm audit fix available from the current version line.
7. Production build still warns about a very large JS bundle and mixed static/dynamic imports around the Supabase client.

## Estimated Remaining Time

If no new schema surprises appear after deployment, the remaining work is about 1.5 to 2 working days:

- 2 to 4 hours: deploy migrations and edge functions to the correct Supabase project, then verify env alignment
- 1 to 2 hours: replace or reset admin E2E credentials and rerun admin smoke coverage
- 3 to 5 hours: resolve the live `check_subscription_limits` and `customer_follow_ups` deployment mismatch, then rerun route smoke
- 2 to 4 hours: final regression pass, release notes, and rollout sanity checks
