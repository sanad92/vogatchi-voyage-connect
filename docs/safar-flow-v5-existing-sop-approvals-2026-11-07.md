# Safar Flow V5 — Reuse & Harden Existing SOP Approvals

**Source-staged only. No live database update or production rollout.**

## Verified current system

- `public.sop_approvals` already exists, with approval types:
  `discount`, `free_service`, `booking_confirmation`,
  `supplier_payment`, `refund_compensation`.
- Existing `sop_request_approval` and `sop_decide_approval` RPCs
  and React Query hooks already handle requests and decisions.
- Existing `/sop/compliance` displays pending approvals.
- `sop_advance_lead` and supplier payment guards already inspect
  approved SOP records. Do not implement a second approval ledger.
- The legacy `sop_decide_approval` SQL lacked an explicit pending-state guard,
  a row lock, a self-approval guard and a nonblank rejection reason.
- The original `sop_approvals` table granted direct INSERT/UPDATE to
  `authenticated`, with broad org-member RLS. Those grants permit a
  bypass of the managerial decision RPC, pending a full review of RLS.
  This PR closes that bypass in staged SQL.

## Changes in this PR

1. Added `SafarFlowApprovalCenter` panel in Safar Flow Studio:
   existing pending SOP approvals, recent decisions, booking links,
   reasons, manager review/confirm UI and rejection notes.
2. Existing React Query hooks/RPCs are used; no duplicate approval model.
3. Added `scripts/deploy-safar-flow-sop-approval-guard.sql`:
   - revoke direct approval table INSERT/UPDATE/DELETE for browser users
   - preserve authenticated SELECT, and service-role privileges
   - replace decision RPC with a row lock and pending-state check
   - enforce active management role, prevent self-approval
   - require a meaningful rejection reason, limit note length
   - emit the existing decision event once for successful requests
   - never carry out a refund, payment, discount or booking confirmation
4. Added Arabic business-friendly labels for new denial reasons.
5. Added ephemeral PostgreSQL approval security integration tests to
   GitHub Actions, isolated from all other fixture databases.

## Important business/product consideration

Single-user organizations will no longer be able to have the
only manager approve a request that they submitted themselves.
For a single-person company, provide a **separate, explicitly designed
and audited approval policy** in a later phase; do not silently turn
self-approval back on. This needs product/legal review before rollout.

## Acceptance and deployment gates

- Do not merge until PR #17, #18, #19, #20, #21 and #22 are reviewed in order.
- Review all historical SOP functions that insert or update SOP approval rows;
  the staged grant removal may affect old integrations.
- Test against real schema with authenticated manager, employee, inactive user,
  cross-company user, second manager, and single-person company.
- Test positive approval, negative decision with note, duplicate decisions,
  simultaneous decisions, forged direct table INSERT/UPDATE, RLS and audit events.
- Verify existing SOP compliance page and pipeline still work after the RPC swap.
- Approval must remain **a permissioned decision only**, not an automatic
  supplier payment, refund, booking confirmation or financial ledger update.
- Check Safar Flow Studio permission gate and subscription restrictions.
- The hosted Lovable Cloud DB has not been accessible for direct SELECT during
  the previous phase; no migration has been applied or verified live.

## Follow-on work

- Approvals for structured booking amendments and separate proposal versions,
  once the trip amendment data model is reviewed.
- Controlled exception policy for single-manager companies.
- Approval policies with configurable thresholds, but not from the browser
  or without server enforcement.
- Production data access, staging sign-in tests and controlled release.
