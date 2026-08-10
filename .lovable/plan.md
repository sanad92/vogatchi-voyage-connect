# Fix: publishing pricing fails with a status type error

## What's happening
Publishing a pricing request fails with `column "status" is of type sop_pricing_status but expression is of type text`.

The publish routine sets the request status using a conditional expression (`quoted` vs `requoted`). Postgres evaluates that conditional as plain text, and the status column uses a strict status type, so the update is rejected. Everything before that point (quote creation, quote items) succeeds, so the failure happens at the last step.

## The fix
Run one database migration that updates `sop_publish_pricing` so the computed status value is explicitly typed as the pricing status type before it is written.

Technical detail: in the `UPDATE public.sop_pricing_requests SET status = CASE ... END` expression, cast the result to `public.sop_pricing_status` (and cast the branch literals) so the assignment matches the column type. No other logic changes.

## Verification
Publish a pricing request that has a recommended option and a valid price-validity date, then confirm:
- the request status becomes `quoted` (or `requoted` on a re-publish),
- the linked quote and its option line items exist.
