# Sprint 10.4 — Marketing Automation & Launch Readiness

Realistic scope for one sprint turn. I'll ship the backend + core UI now and flag anything deferred to v1.1 with rationale rather than half-building it.

## 1. Marketing Automation Engine

**Database (single migration)**
- `marketing_journeys` — org-scoped journey definitions (name, trigger_event, enrollment_condition jsonb, goal_event, is_active, stats)
- `journey_steps` — ordered nodes (step_type: `send_whatsapp` | `send_email` | `wait` | `condition` | `tag` | `emit_event`, config jsonb, next_step_id, branch_yes_id, branch_no_id, delay_minutes)
- `journey_enrollments` — one row per customer per journey (current_step_id, status: active/completed/exited/goal_hit, next_run_at, context jsonb)
- `journey_step_runs` — audit trail per step execution
- 9 seeded starter journeys (Welcome Lead, Follow-up, Abandoned Quote, Payment Reminder, Pre-Travel, Travel Day, Post-Travel Review, Loyalty, Win-back) as inactive templates
- RPC `enroll_in_journey(journey_id, customer_id, context)` — idempotent
- RPC `process_journey_enrollments()` — cron-driven step executor
- Event Bus subscription: on domain events matching journey triggers → auto-enroll

**Workflow action wiring (real sends)**
- `_workflow_run_step` `send_whatsapp` → invoke `send-whatsapp-message` edge fn with rendered template
- `_workflow_run_step` `send_email` → invoke `send-transactional-email` if infra present, else `email_queue` fallback
- Shared plpgsql helper `_render_template(text, vars jsonb)` for `{{var}}` substitution

**Frontend**
- `useMarketingJourneys` hook (list/upsert/toggle/enroll/analytics)
- `/marketing/journeys` list page with stats (enrolled, completed, goal rate, conversion)
- `/marketing/journeys/:id` editor — linear step list with drag-reorder, per-step config panel (no full canvas graph — deferred to v1.1)
- Analytics tab: funnel by step, goal completion, exit reasons

## 2. Template Center hardening

- New `template_versions` table (template_id, version_no, content, subject, created_by, notes) — auto-snapshot on update via trigger
- Add `is_org_default`, `approval_status` (draft/pending/approved/rejected), `approved_by`, `approved_at` to `whatsapp_templates` and `document_templates`
- Variable validation: extract `{{vars}}` from body, compare against declared `variables` array — surface warnings in UI
- Template Center UI additions: Version History dialog with diff/restore, Approve/Reject buttons for admins, "Set as org default" toggle

## 3. Navigation additions

- Sidebar: Document Center under Operations, Supplier Workspace shortcut under Suppliers, Marketing Journeys under Marketing

## 4. Storage policy audit

Read current `documents` bucket policies via psql; confirm `{orgId}/uploads/...` prefix scoping; add explicit policy for the new upload paths if missing.

## 5. Audits & Launch Readiness

- Typecheck (tsgo)
- Accessibility pass on new pages (aria-labels on icon buttons, semantic headings)
- Responsive check via Playwright at 375/1280 widths on new routes
- Full authenticated E2E: skipped unless `LOVABLE_BROWSER_AUTH_STATUS=injected` — will run and screenshot Lead→Voucher if session available
- Launch Readiness Report with scored dimensions + v1.1 roadmap

## Deferred to v1.1 (called out, not silently dropped)

- Full node-graph visual journey canvas (React Flow) — using ordered step list for now
- A/B testing on journey messages
- Consent management (GDPR unsubscribe segmentation beyond existing `suppressed_emails`)
- Approval workflow email notifications to admins

## Deliverable

Sprint 10.4 report + Launch Readiness Report + prioritized v1.1 roadmap.
