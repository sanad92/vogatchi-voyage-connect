# Safar Flow — Phase 2: Template Studio, Preview-Only

## Source audit
- Safar ERP currently has at least three distinct automation surfaces:
  - `automation_rules` with client-side `useAutomationEngine`
  - `workflow_rules` with a SQL event-driven dispatcher
  - `whatsapp_automation_rules_v2` with its own Edge Function
- `workflow_rules` has a later `_workflow_run_step` SQL helper and handler override; do not assume the earliest minimal handler is the final runtime.
- These systems are NOT consolidated. No existing automation is replaced by this PR.

## Delivered
- A strictly side-effect-free simulator and validator under `src/lib/safarFlow/`.
- Five predefined blueprints with realistic conditions and actions:
  quote follow-up, supplier confirmation, supplier payment review,
  WhatsApp travel intake, pretravel document checklist.
- Guardrails: allow-listed event/action types, bounded delays, validated
  condition fields, explicit human review annotations, read-only simulations.
- Secured route `/safar-flow` under existing `automation_view` permission and
  automation subscription feature gate, with sidebar discoverability.
- Sample-only UI: no real customer, financial or passport data loaded or used.
- Automated positive/negative template tests, TypeScript and build CI.

## Intentional limitations
- Templates are preview-only and do not create rules, send messages, write data,
  perform booking confirmations, send financial instructions or run jobs.
- A durable orchestration engine needs server-side event ownership, tenant-scoped
  credentials, idempotency keys, locking, retries, scheduling and audit logs.
- The runtime should reconcile or replace existing fragmented automation surfaces,
  avoiding a fourth uncontrolled engine.
- Follow-up requires a functioning isolated cloud database/test company plus
  authenticated, cross-organization acceptance tests.

## Server-side V1 acceptance criteria (NOT YET SHIPPED)
1. Quote follow-up waits 24 hours and re-checks response and quote status.
2. Booking task triggers exactly once per event even with retries or concurrent workers.
3. User from org A cannot enable or execute org B workflows or view its logs.
4. WhatsApp AI produces reviewable drafts only, never confirms a booking.
5. A supplier payment reminder never charges, refunds or edits an invoice.
6. Disabling a workflow cancels pending outbound actions and still records an audit trace.
7. A paused worker resumes without duplicate side effects.
8. Enforce quotas, retention and consent for business-messaging automations.

## Database status at time of work
Lovable API reported database stack 'supabase' enabled, but an attempted read-only
SELECT returned 'Database is possibly not accessible at the moment'.
No SQL migration or database mutation performed during this PR.
