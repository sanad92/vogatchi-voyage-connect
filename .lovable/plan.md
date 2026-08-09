# Vogatchi Departmental SOP as Enforced Workflow

## Audit result (what already exists — we reuse, not rebuild)

| Capability | Status today |
|---|---|
| Booking master + stages | `bookings.workflow_stage` enum, `advance_workflow`, `get_workflow_progress`, `workflow_definitions` / `workflow_stages` (has an unused `required_fields` JSON column) |
| Booking automation | `run_booking_automation`, `booking_automation_runs/steps`, invoice + supplier PO + voucher + `booking_financial_snapshots` + `booking_timeline_events` + `messaging_suggestions` — already idempotent |
| Event bus | `domain_events`, `event_subscriptions`, `event_deliveries`, `emit_event`, handlers, replay |
| Rules engine | `workflow_rules`, `workflow_rule_runs`, visual Rule Builder |
| Quotes | `quotes` + `quote_items` + `convert_quote_to_bookings` |
| Finance | invoices, payments, supplier payment orders, ledgers, approvals, refunds |
| WhatsApp workspace | conversations with assignment, SLA fields, Customer360 + Actions panels |
| Roles / RLS | `organization_members` (owner/admin/manager/agent/viewer), branches, departments, `get_user_org_role` |

**Real gaps:** there is no Lead entity (only a marketing `service_requests` form table), no department concept for CS/Sales/Reservations, no round-robin assignment, no Pricing Request, no Recheck, no Handover records, no approval gates for discount/confirmation/supplier payment, no operational deadlines, no incidents, no SOP compliance view, no department KPIs.

## What will be built

### A. Data foundation (one migration)
New tables, all org-scoped, RLS + GRANTs, `updated_at` triggers, every write emitting a domain event:

- `sop_leads` — intake record (contact, destination, dates, adults, children+ages JSON, rooms, budget/service level, priorities, reference hotel/screenshot, source/campaign/arrival time), `stage`, `owner_department`, `current_owner_id`, `customer_id`, links to conversation/quote/booking.
- `lead_assignments` — round-robin history: assignee, method (`round_robin` / `exception`), exception reason, `acknowledged_at`, SLA deadline, reassignment reason, actor.
- `sop_department_members` — maps org members to `customer_service` / `sales` / `reservations` / `operations` / `management`, with `is_available` + `round_robin_cursor` support.
- `pricing_requests` — Reservations-owned; brief snapshot, supplier options (max 3) with net cost, policies, markup, selling price, validity; status `requested → in_progress → quoted → requoted → recheck → closed`.
- `pricing_request_options` — per-option supplier/net/policy/selling/profit rows.
- `sop_handovers` — typed handover (`cs_to_sales`, `sales_to_reservations`, `reservations_to_sales`, `reservations_to_cs`), sender, receiver, checklist JSON, missing items, completeness status, timestamps.
- `sop_approvals` — `discount`, `free_service`, `booking_confirmation`, `supplier_payment`, `refund_compensation`; requester, approver, decision, reason.
- `operational_deadlines` — payment / cancellation / release / pre-arrival / reconfirmation, due_at, status, alerted_at.
- `incidents` — severity, owner, next_update_at, escalation level, resolution, linked booking/customer.
- `post_trip_actions` — feedback, review, referral, repeat-opportunity, with due dates.
- Reuse existing tables everywhere else (no duplicate booking/quote/invoice tables).

### B. Enforcement logic (DB functions — the actual gates)
- `sop_validate_transition(entity, id, target)` → returns `{allowed, missing_fields[], violations[]}`. Powers *every* UI gate so the missing-data list is identical server- and client-side.
- `sop_assign_lead_round_robin(lead_id, exception_reason)` → picks next available Sales member, writes `lead_assignments`, sets acknowledgement SLA.
- `sop_acknowledge_assignment`, `sop_reassign_lead(reason)` — reason mandatory.
- `sop_create_pricing_request` — blocks unless the Sales brief is complete; returns missing fields.
- `sop_submit_quotation` — Reservations only; enforces max 3 options and required net/policy fields.
- `sop_request_recheck` / `sop_complete_recheck(changed boolean)` — when changed, forces a Requote and blocks collection.
- `sop_request_approval` / `sop_decide_approval` — manager/owner only.
- `sop_create_handover(type)` — computes checklist completeness, blocks stage advance when incomplete.
- Guard triggers: Sales role cannot write supplier cost/net/selling columns on `pricing_requests` / `pricing_request_options`; booking confirmation blocked without verified collection + management approval; supplier payment order approval blocked without both.
- Backfill: existing bookings/quotes get `sop_leads` shadow rows in a terminal stage so history stays intact and Historical Recovery keeps working. Nothing is deleted.

### C. Permissions
`sop_has_department(user, dept)` security-definer function + a `DepartmentGate` component alongside the existing `PermissionGate`. Gates applied to: pricing fields (Reservations), approvals (management), intake (CS), pipeline (Sales).

### D. Hooks + UI
- Hooks: `useSopLeads`, `useLeadAssignment`, `usePricingRequests`, `useHandovers`, `useSopApprovals`, `useOperationalDeadlines`, `useIncidents`, `useSopCompliance`, `useDepartmentKpis` — all keyed by `useOrgId`, realtime-invalidated.
- Pages: `/sop/intake` (CS intake form with completeness meter), `/sop/pipeline` (Sales: New/Qualified/Quoted/Follow-up/Won/Lost with mandatory Lost Reason), `/sop/pricing` (Reservations Pricing Request workspace), `/sop/compliance` (stuck items, missing fields, overdue handovers, SLA breaches, unowned leads, upcoming deadlines, SOP violations), `/sop/kpis` (three department dashboards with the playbook metric definitions).
- Booking Workspace: new **Handover**, **Approvals**, **Deadlines** panels; Recheck action wired into the existing SmartNextActionCard.
- WhatsApp workspace: an **SOP** panel in the conversation right rail showing current owner, department, stage, missing fields and the next required action, with in-place buttons for Handoff / Pricing Request / Recheck.

### E. Wiring
- Event subscriptions for every SOP action → timeline + notifications; deadline and SLA sweeps handled by existing rule-engine handlers.
- Confirmed booking continues to call `run_booking_automation` (invoice, supplier PO, voucher, snapshot, timeline, messaging suggestions) — unchanged and idempotent.

## Delivery order
1. Migration A + B (schema, gates, backfill), linter clean.
2. Permissions + hooks.
3. CS intake, round robin, Sales pipeline, handovers.
4. Pricing Request workspace, Recheck, approvals.
5. Deadlines, incidents, post-trip.
6. Compliance view, KPI dashboards, WhatsApp panel.
7. Typecheck + authenticated runtime pass of Lead → Quote → Recheck → Approval → Collection → Booking → Operations → After-sales, then the Implemented / Existing / Fixed / Blocked gap report with files and migrations touched.

## Notes / assumptions
- Departments are modelled with a dedicated SOP department mapping rather than the free-text `employees.department` field, so round robin and gates are deterministic. Existing department records are left untouched.
- "Max 3 options" is enforced as a hard constraint on quotation submission.
- SLA windows (assignment acknowledgement, first response, next incident update) are org settings with sane defaults, editable later.
