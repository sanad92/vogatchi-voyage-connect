# E2E & Smoke Testing Guide

This document explains how to run the Playwright-based end-to-end (E2E) and smoke tests for the **vogatchi-voyage-connect** dashboard.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18+ |
| npm | 9+ |

Install project dependencies (including Playwright) once:

```bash
npm install --legacy-peer-deps
npx playwright install chromium --with-deps
```

---

## Configuration

The tests require real credentials for the staging/production environment.  
Credentials are read from **environment variables** – never hardcoded in the repo.

### Local development

1. Copy the sample env file:

   ```bash
   cp .env.e2e.example .env.e2e
   ```

2. Edit `.env.e2e` and fill in the values:

   ```dotenv
   E2E_BASE_URL=https://vogatchi-voyage-connect.lovable.app
   E2E_SUPER_ADMIN_EMAIL=your-admin@example.com
   E2E_SUPER_ADMIN_PASSWORD=YourStrongPassword
   ```

   Then export them before running the tests:

   ```bash
   export $(grep -v '^#' .env.e2e | xargs)
   npm run e2e
   ```

   > ⚠️ `.env.e2e` is **git-ignored** and must never be committed.

### CI / GitHub Actions

Set the following [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) in your repository:

| Secret | Description |
|--------|-------------|
| `E2E_SUPER_ADMIN_EMAIL` | Super-admin email address |
| `E2E_SUPER_ADMIN_PASSWORD` | Super-admin password |

The `E2E_BASE_URL` can optionally be passed as a `workflow_dispatch` input; it defaults to the production URL.

---

## Running the tests

### Headless (default – same as CI)

```bash
npm run e2e
```

### Headed (see the browser)

```bash
npm run e2e:headed
```

### Interactive UI mode

```bash
npm run e2e:ui
```

### Open the last HTML report

```bash
npm run e2e:report
```

---

## Test structure

```
tests/e2e/
├── helpers/
│   └── auth.ts                       # Shared login helper
├── auth.spec.ts                      # Login flow & unauthenticated redirects
├── protected-routes.spec.ts          # /dashboard requires auth
├── admin-routes.spec.ts              # AdminRouteGuard routes
├── platform-admin-routes.spec.ts     # PlatformAdminGuard routes
├── subscription-onboarding.spec.ts   # Post-login redirect smoke-check
└── smoke.spec.ts                     # Core module pages load without errors
```

### What the tests cover

| Test file | Coverage |
|-----------|----------|
| `auth.spec.ts` | Login renders; unauthenticated → `/login`; super admin login succeeds with no JS errors |
| `protected-routes.spec.ts` | `/dashboard` requires auth; super admin can reach it after login |
| `admin-routes.spec.ts` | `/admin-settings`, `/monitoring`, `/admin/cms` are accessible to super admin |
| `platform-admin-routes.spec.ts` | `/platform-admin`, `/platform-admin/organizations`, `/platform-admin/subscriptions`, `/database-manager` are accessible to super admin |
| `subscription-onboarding.spec.ts` | After login, user lands on a valid page (no crash, no redirect loop) |
| `smoke.spec.ts` | `/customers`, `/invoices`, `/reports`, `/bank-accounts`, `/expense-management`, `/hotel-bookings`, `/flight-bookings`, `/transport-bookings`, `/car-rentals`, `/whatsapp` all load without uncaught JS errors |

### Error detection

- **Console errors** – tests fail on any `console.error` that is not in the known-benign list (e.g. `ResizeObserver`, `favicon`, `net::ERR_ABORTED`).
- **Network failures** – 4xx/5xx responses from non-Supabase URLs are flagged.
- **Error boundaries** – tests assert that the "Something went wrong" error boundary is not visible.

---

## Artifacts on failure

When a test fails, Playwright automatically captures:

| Artifact | Location |
|----------|----------|
| Screenshot | `test-results/<test-name>/test-failed-*.png` |
| Video | `test-results/<test-name>/video.webm` |
| Trace | `test-results/<test-name>/trace.zip` |
| HTML report | `playwright-report/index.html` |

In CI, all artifacts are uploaded and available for 14 days via **GitHub Actions → Artifacts**.

To inspect a trace locally:

```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

---

## GitHub Actions

The workflow file is at `.github/workflows/e2e.yml`.  
It runs:

- **On every push to `main`**
- **On demand** via `workflow_dispatch` (with an optional `base_url` input)
