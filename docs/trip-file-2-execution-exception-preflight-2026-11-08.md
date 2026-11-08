# Safar ERP / Trip File 2.0 — Sprint 8: Execution Exceptions

**Source code staged for review; no live DB changes, rollout, supplier action, refund or payment.**

## Purpose

Prior integrated QA branch (#32) combined booking amendments, supplier/finance handoffs,
original document evidence, allocations, quote versions and currency-safe service totals.
This sprint provides a **READ-ONLY, fail-closed exception report** in the existing
BookingWorkspace amendment financial review.

Per approved amendment it checks:
- Same organization and booking across the proposal, handoff and linked original documents
- Cancelled booking or blocked supplier follow-up
- Supplier reference, independent finance review, and independent manager attestation
- Unspecified selling/supplier delta, or a money delta without currency
- Missing customer/supplier source documentation when money changes
- Reversed, stale, overallocated, mixed-currency, partial or unreadable original finance data
- Incomplete or truncated source queries
- Explicit warning that a document linked to the whole booking does not prove
  the proposed amendment-specific price difference

The report's states are BLOCKED, NEEDS HUMAN REVIEW and INTERNAL RECORDS DOCUMENTED.
The last state is not permission to execute anything. Every report explicitly marks
external supplier verification as NOT IMPLEMENTED, even when all internal checks pass.

## Security gap fixed

Previously the source-document link RPC on draft #30 allowed any approved request
with a handoff status other than supplier_pending. A BLOCKED handoff could therefore
receive new document links. Now only supplier_confirmed, finance_reviewed, and
execution_reported are accepted on the server, and the UI also removes blocked
requests from the form selector, while preserving their read-only audit history.

## Verification

- New pure TypeScript regression: blocked/cancelled, unverified external provider,
  tenant mismatch, reviewer separation, financial changes without corresponding
  documents, historical reversal, stale data, invalid/partial allocations and
  truncated data.
- Isolated PostgreSQL 16 regression: reject a new finance document link when an
  otherwise approved request has a BLOCKED handoff.
- Existing integration source contracts, TypeScript type check and production build.
- Passing these checks only verifies fixture/source behavior; not live JWT/RLS,
  real provider booking state, settlement or issued refund.

## Release conditions

- Stacked behind #32 (and #31 → #30 → #29 → #26); independent sibling #27/#28
  code is already included in #32. Do not merge duplicate PRs blindly.
- Hosted Lovable Cloud database read-only access still requires verification.
- Run a real two-company authenticated staging test before applying changes.
- A trustworthy supplier API verification adapter requires real read-only access,
  separate secrets, tenant isolation, known status semantics and complete audit trails.
- Do not introduce automatic supplier amendments, refunds, customer messaging or
  payment execution until signed-off security and business tests are complete.
- A three-person segregation exception process for smaller agencies remains unresolved.
