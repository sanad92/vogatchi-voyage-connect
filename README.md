# Vogatchi Voyage Connect

Travel operations SaaS built around a Vite + React frontend and Supabase backend. The active release target is the React/Supabase app under `src/` and `supabase/`. The repo also contains older PHP/MySQL code under `admin/`, `api/`, `classes/`, and `database/` that is not the primary app entry path for the current SaaS flow.

## Stack

- Frontend: Vite, React 18, TypeScript, React Router, TanStack Query, Tailwind, shadcn/ui
- Backend: Supabase Auth, PostgREST, SQL migrations, Edge Functions
- Testing: Playwright

## Main Entry Points

- `src/main.tsx`: mounts the SPA
- `src/App.tsx`: router, providers, protected routes, onboarding and subscription guards
- `src/integrations/supabase/client.ts`: browser Supabase client
- `src/hooks/useOptimizedAuth.tsx`: signup/login/session lifecycle
- `src/contexts/OrganizationContext.tsx`: current org membership and org switching
- `src/contexts/SubscriptionContext.tsx`: subscription enforcement
- `supabase/functions/create-organization-onboarding/index.ts`: onboarding edge API
- `supabase/functions/create-payment/index.ts`: Paymob payment edge API

## Request Flow

1. Browser routes through `src/App.tsx`.
2. Authenticated pages use the Supabase browser client from `src/integrations/supabase/client.ts`.
3. Frontend reads and writes tenant-scoped data through PostgREST and RPCs.
4. Sensitive server-side actions go through Supabase Edge Functions in `supabase/functions/`.
5. Edge Functions call Supabase tables and RPCs with anon or service-role secrets as needed.

Examples:

- Signup/login: `SignupPage` / `LoginPage` -> Supabase Auth -> `OrganizationContext` / `SupabaseProtectedRoute`
- Create organization: `RegisterOrganization.tsx` -> `create-organization-onboarding` edge function -> `create_organization_onboarding(...)` RPC -> `organizations` / `organization_members` / `subscriptions`
- Dashboard: `OptimizedIndex.tsx` -> PostgREST table reads + `check_subscription_limits(...)` RPC

## Required Environment Variables

### Local frontend `.env`

Copy `.env.example` to `.env` and fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

### Supabase Edge Function secrets

Configure these in Supabase function secrets, not in browser env files:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `PAYMOB_API_KEY`
- `PAYMOB_INTEGRATION_ID`
- `PAYMOB_IFRAME_ID`
- `PAYMOB_HMAC`
- `RESEND_API_KEY`

### Playwright `.env.e2e`

Copy `.env.e2e.example` to `.env.e2e`:

- `E2E_BASE_URL`
- `E2E_SUPER_ADMIN_EMAIL`
- `E2E_SUPER_ADMIN_PASSWORD`

## Install And Run

```sh
npm ci
npm run dev
```

Build the app:

```sh
npm run build
```

Run Playwright:

```sh
npm run e2e
```

## Supabase Layout

- `supabase/migrations/`: canonical schema and policy history for the React/Supabase app
- `supabase/functions/`: Edge Functions used by the frontend
- `scripts/supabase-schema-check.mjs`: lightweight remote schema/readability smoke check

## Notes

- `.env` is intentionally git-ignored and should stay local-only.
- Release verification details are captured in `RELEASE_READINESS_REPORT_2026-04-04.md`.
