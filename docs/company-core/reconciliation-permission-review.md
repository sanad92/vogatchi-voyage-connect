# Reconciliation permissions — 2026-09-08

Implemented through Lovable. Migration: `20260908130726_cd2e23d9-5d68-4ad4-9423-b15b938eb6ac.sql`.

Management uses the existing `banking_transactions` company permission plus `can_org_write`. Finance department membership and manager titles no longer bypass permission decisions. Owner/admin behavior remains defined by the central resolver. No financial calculations, balances, roles or permission overrides were changed.

Eight authenticated-role SQL assertions passed before and after application with full rollback: finance denial, real create RPC denial, manager denial, explicit grant, inactive membership, foreign membership, owner access and missing identity. Anonymous function execution was independently verified revoked. Sessions, lines and matches remained zero after QA.

UI uses a company-and-user scoped server query. Actions fail closed on pending requests, background revalidation and errors. Actual page tests cover allow/deny/loading/error, closure and retained read-only display. Hook tests also verify cached-allow rejection during revalidation/error and query scoping. Native Lovable reported build and typecheck passing for the initial UI commit; the follow-up tightens cache handling. Browser acceptance and production publishing were not performed.
