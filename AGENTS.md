
- Company email uses per-org IMAP/SMTP credentials encrypted with EMAIL_CREDENTIALS_KEY inside edge functions (_shared/mail.ts); the browser never reads passwords. Why: each company connects its own mailbox.
- Legacy booking status changes use the explicit service type and an acknowledged, organization-authorized invoker RPC; why: prevent wrong-table no-ops and bypassing tenant permissions.
- Email read-state changes use an acknowledged, organization-scoped RPC restricted to visible threads and read fields; why: queue readers can persist state without gaining assignment or workflow write access.
- Platform branding is shared through the logo component and semantic theme tokens; keep tenant names, document branding, contacts and stable identifiers separate so rebranding never alters company data.
- English UI = Arabic source strings + runtime DOM translation (src/i18n/domTranslator.ts) from a lazily loaded dictionary (en-auto.json, generated; en.ts manual overrides win); why: covers every screen without rewriting each page. Mark the language toggle and other must-not-translate nodes with data-no-translate.
- Platform administration uses platform_roles via PlatformAdminGuard and /platform/login. Dedicated platform-finance grants allow access to /platform/finance only. Neither path depends on company membership. The admin.safarerp.com host maps / and /login to the platform area.

- Company sign-up and staff invitations reject free mailbox domains in UI, onboarding, invitation RPCs and pending-invitation insert/update triggers; verified work email is required by onboarding and acceptance RPCs. Why: direct calls and old invitations cannot bypass B2B enforcement; keep domain lists in sync.
- Privileged RPC denial predicates coalesce missing organization roles to an empty value, and membership identity is immutable. Why: SQL NULL must deny access, and memberships must never move between tenants or users.
- Staff invitation emails are rendered and queued by the send-invitation-email function after the invitation RPC; the database never builds or queues email. Why: keeps email sending convertible to managed delivery.
- Subscription checkout uses Paymob Unified Checkout (Intention API with secret key, card + wallet integration IDs from secrets); the legacy iframe flow is retired. Why: Paymob no longer supports the legacy flow and it breaks 3DS.

## Parallel team workflow

- Start independent work in parallel within the available agent slots. While product development investigates and writes proposals, implementation progresses on ready work and prepares scoped implementation or tests for proposals in progress. Reviewers inspect the current behavior, define acceptance cases, and review changes as they become available. QA and delivery prepare fixtures, verification, and release steps from the start.
- For each workstream, record its owner, scope, dependencies, and acceptance criteria. Identify the owner of each shared file or interface before editing. Use separate branches or worktrees for concurrent repository changes and coordinate shared changes through the assigned owner.
- Share interim findings that affect another workstream as soon as they are verified. Attach the relevant files, revision, test results, and exact blockers to each handoff. If work depends on another result, move to the next independent task while that dependency is resolved.
- Sequence only the work that genuinely depends on another result. Integrate compatible changes as they become ready and verify the combined affected paths before reporting completion or releasing them. Treat a review of a proposal or an individual branch as evidence for that scope.
