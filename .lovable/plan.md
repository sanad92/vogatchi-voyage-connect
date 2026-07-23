
# Phase 7 – SaaS Core & Enterprise Platform

This phase is very large. Before writing migrations and pages I want to confirm scope so we don't duplicate what already exists (Platform Admin, `user_roles`, `organizations`, `organization_settings`, `admin_audit_log`, `subscription_plans`, `subscriptions`, `platform_roles`, existing PermissionsManagement, etc.).

## What already exists (will be reused, not rebuilt)
- Organizations, organization_settings, organization_members
- user_roles + has_role() + PermissionRouteGuard + PermissionsManagement
- Platform Admin area (`/platform-admin/*`) with Analytics, Organizations, Plans, Subscriptions, Audit, Settings
- admin_audit_log (immutable via triggers)
- subscription_plans, subscriptions, subscription enforcement, bank_transfer_requests
- useImpersonation / useOrgImpersonation (basic "act as")

## What Phase 7 will add (net-new only)

### 1. Database migrations
- `branches` table (org-scoped, name, code, address, phone, manager_id, is_active) + GRANT + RLS
- `departments` table (org-scoped, name, code, branch_id?, manager_id, is_active) + GRANT + RLS
- Extend `profiles` / `organization_members` with `branch_id`, `department_id` (nullable)
- `feature_flags` table (org-scoped key/value, plus global overrides) + RLS
- `white_label_settings` table (org-scoped: logo_url, brand_name, primary_color, accent_color, custom_domain, email_from_name, favicon_url) + RLS
- `security_settings` table (org-scoped: mfa_required, session_timeout_min, ip_allowlist jsonb, password_policy jsonb) + RLS
- `impersonation_sessions` table (super_admin_id, target_org_id, target_user_id?, reason TEXT NOT NULL, mfa_verified bool, org_pin_verified bool, started_at, ended_at, ip, user_agent) — append-only, RLS: platform admins only
- Trigger: any write during an active impersonation session copies `session_id` into `admin_audit_log.details`

### 2. Edge functions
- `platform-impersonate-start` – validates MFA code + org PIN + reason, creates impersonation_session, returns short-lived scoped JWT claim
- `platform-impersonate-stop` – closes session, writes audit
- `org-generate-pin` – org owner sets/rotates the 6-digit PIN required for anyone to impersonate their org
- `feature-flag-evaluate` – helper for server-side flag checks

### 3. Frontend – Org-scoped (under `/organization/*`)
- `OrganizationCenter` – overview: branches count, departments count, users, plan, usage
- `BranchesPage` – CRUD
- `DepartmentsPage` – CRUD, optional branch link
- `OrgUsersPage` – extend existing TeamManagement with branch/department assignment
- `RolesPermissionsPage` – wrap existing PermissionsManagement + role templates
- `OrgSettingsPage` – general + locale + currency (uses organization_settings)
- `FeatureFlagsPage` – toggle org-level flags
- `WhiteLabelPage` – branding form + live preview
- `SecurityCenterPage` – MFA enforcement, session timeout, IP allowlist, org PIN management
- `AuditCenterPage` – enhanced viewer with export CSV + filters by user/action/table/date

### 4. Frontend – Platform-scoped (extends `/platform-admin/*`)
- `PlatformDashboard` – MRR, active orgs, churn, top plans, recent signups (reuses existing analytics query)
- `PlatformActAsPage` – search org → search user → require MFA code + org PIN + reason → start session → banner across app while active → "Return to my account" button
- Global banner component `<ImpersonationBanner />` mounted in App layout

### 5. Runtime helpers
- `useFeatureFlag(key)` hook
- `useWhiteLabel()` – apply CSS variables + logo at boot
- `useImpersonationSession()` – hydrates banner + injects `session_id` into every mutation for audit chain

### 6. RBAC
- Extend `has_permission` with new keys: `org.branches.manage`, `org.departments.manage`, `org.feature_flags.manage`, `org.white_label.manage`, `org.security.manage`, `platform.impersonate`
- Route guards on all new pages

### 7. Backward compatibility guarantees
- No changes to existing bookings/finance/whatsapp/crm/accounting logic
- All new tables nullable-linked; existing rows keep working with `branch_id=NULL`
- Existing RLS untouched; new tables get their own policies
- Existing `useImpersonation` kept; new PlatformActAs uses stricter path but old callers still work

### 8. Validation
- Playwright script under `/tmp/browser/phase7/`:
  1. Login as platform owner
  2. Create branch + department + assign user
  3. Toggle a feature flag and verify UI reacts
  4. Update white-label brand color and verify CSS variable applied
  5. Attempt Act-As without reason → blocked; with reason + PIN + MFA → banner shows, mutation appears in audit with session_id
  6. Return to own account
- Screenshots saved and reviewed

### 9. Deliverables in final message
- Migrations list, files changed, routes added, Playwright results, remaining gaps / tech debt

## Scope questions before I start
1. **MFA source**: use Supabase Auth TOTP (built-in) for the "MFA" in Act-As? Or a simple 6-digit email OTP via existing email infra?
2. **Org PIN**: 6-digit numeric, hashed with bcrypt in `security_settings` — OK?
3. **Feature flags**: org-level only, or also per-user? I recommend org-level only for now.
4. **White label custom domain**: store the value but do NOT wire DNS/hosting in this phase (out of scope) — OK?
5. **Branches/Departments**: purely organizational (no data partitioning) or should bookings/customers gain optional `branch_id` filters? I recommend organizational only for now; data-partitioning can be Phase 7.5.

Reply with answers (or "defaults OK") and I'll execute end-to-end in one go.
