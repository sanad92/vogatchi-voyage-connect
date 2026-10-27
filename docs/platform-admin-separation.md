# Platform Admin split — deployment checklist

This branch adds a **separate Vite entry and output** for the platform administration UI. It does not yet remove the legacy `/platform` routes from the customer application, intentionally preserving a rollback path until the admin host is verified.

## Build

```sh
bun install --frozen-lockfile
bun run build:admin
```

Deploy the **contents of `dist-admin/`** as a separate static application to `admin.safarerp.com`. Configure SPA fallback to `/index.html`, HTTPS, and do not index the admin domain. The admin bundle uses the existing Supabase project; configure the same public Vite Supabase environment variables as the company application. **Never put a service-role key in a Vite variable.**

## Release gates — do not cut over before all pass

1. Confirm DNS and hosting ownership for `admin.safarerp.com`, valid TLS, SPA deep-link reloads, and environment variables.
2. Confirm Supabase Auth permitted site URLs/redirect URLs for the new admin host. Cross-subdomain local storage does not automatically share sessions: admin login is separate.
3. Validate login, password reset, platform role authorization, access denied for normal company users, and sign out.
4. Test all 17 platform routes and cross-application links, especially impersonation / act-as and the return to the company UI.
5. Verify backend authorization and tenant RLS independently; a separate frontend bundle **does not create a security boundary**.
6. Require MFA for platform admins, ideally enforced by backend AAL2 checks, before production cutover.
7. Only after tests, remove `/platform/*` and its imports from the company app, replacing the old route with an external redirect to the verified admin hostname.
8. Keep the legacy release and a rollback plan until production smoke tests pass.

## Current status

Build scaffolding only. Not yet verified in CI, not deployed, no DNS changes, no database changes. The separate build is not a substitute for audited service-role edge functions or row-level security.
