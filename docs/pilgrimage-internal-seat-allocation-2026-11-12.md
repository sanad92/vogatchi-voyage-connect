# Safar ERP | Hajj & Umrah: internal seat inventory and allocation

**Development status:** PR #43 (draft), based on PR #42, which is stacked on PR #41.
**Execution:** GitHub source + ephemeral PostgreSQL 16 in GitHub Actions. No Lovable prompts, Cloud migrations, credit usage, hosting changes, customer records, or live writes.

## Exact meaning of the workflow

| Status | Operations meaning | Counts against internal program capacity? | External supplier confirmed? |
| --- | --- | --- | --- |
| No allocation | Group quote only | No | No |
| `held` while `hold_expires_at` is in the future | Temporary seat hold | Yes | No |
| `held` past expiration | Expired hold, can be reissued if space remains | No | No |
| `allocated` | Seats allocated in the tenant's **internal** program inventory | Yes | **No** |
| `released` | Allocation released and seats freed | No | No |

The word **allocated** is deliberately not equivalent to a paid or supplier-confirmed reservation. Each hold defaults to **120 minutes**; the server accepts 5–1,440 minutes. There is **one allocation row per issued group quote**, with append-only event history for each transition.

Group seats and linked B2B group sales draw from the same program capacity. Independent FIT quotes do **not** use this capacity, and require per-service vendor confirmations in another planned stage.

## Security and concurrency protections

- Only signed-in organization owners/admins/managers may call `transition_pilgrimage_seat_allocation(sale_id, action, hold_minutes)`.
- Roles cannot directly insert/update/delete allocation or event tables through Data API. RLS limits the read history to active organization membership; anonymous and other organizations cannot read it.
- An RPC holds the quote row lock (to serialize cancellations) and the parent program row lock (to serialize competing holds, registered pilgrims, and program capacity edits). Availability is re-evaluated while the lock is held.
- Server totals include active registered pilgrims, all `allocated` seats, and unexpired `held` seats. Expired holds do not consume capacity.
- Ordinary pilgrim INSERT and program capacity UPDATE are guarded against consuming held/allocated inventory, even if a caller bypasses the React UI.
- Duplicate retry for an active hold or existing allocated state returns the same allocation without repeating the audit event.
- An active allocation must be released before cancelling a quoted sale; old audit events stay attached to the original quote.
- For group quotes referencing **already registered pilgrims**, the initial implementation refuses to hold a second set of seats. They need a manual reconciliation flow to prevent double-counting.

## Testing

`scripts/test-pilgrimage-seat-allocations.sql` runs from a brand-new disposable PostgreSQL database, builds the PR #42 group/FIT/B2B test fixture and verifies the new capacity RPC, expiration, cancellation, permission checks and isolation.

`scripts/test-pilgrimage-seat-concurrency.sh` opens two **different PostgreSQL client sessions**. Session A holds 10 B2B seats inside an uncommitted transaction while session B tries to hold 2 other seats with a program capacity of 11 and 1 previously registered pilgrim. B must fail rather than overbook.

The original PR #41 operational fixture, PR #42 sales fixture, frontend unit/TypeScript/build, and PR #43 inventory/race tests each run as separate GitHub Actions checks.

These tests use synthetic JWT subject settings and simplified organization roles, not real hosted Supabase Auth/JWT, frontend interactive browser sessions, licensed supplier services, or financial posting.

## Remaining mandatory work before calling Hajj/Umrah complete

1. **Convert an internal allocation to real traveler registrations** in one server-side transaction with an approved count transfer, preserving each original program's capacity and preventing double-counting. Handle a mix of already registered pilgrims, unknown B2B names, special rooming, and cancellation.
2. **FIT supplier bookings and source evidence**: supplier reference IDs, per-component price/currency, status timeline, operator approval. Do not mark hotel/flight/tour/visa confirmed until source evidence exists.
3. **Financially post group/B2B/FIT bookings**: create/allocate customer invoice or correctly classified advance; agency debtor/credit terms, traveler installments, supplier payables, FX, tax and compliant refunds. The new RPC does none of these.
4. **Document security and traveler operations**: private file storage, real team permissions, audit of official visa/permit/status changes, family/room allocations, printed documents and privacy retention.
5. **Approve season-specific official processes and template terms** with an authorized operator; no API issuing Hajj or Umrah government credentials is implemented.
6. **Run staging against a verified non-production clone**, approved migrations #41 → #42 → #43, genuine signed-in two-tenant JWT/RLS, concurrent REST/RPC and ledger tests, then review release and rollback. No deployment approval is implied by GitHub CI.

## Release/rollback notes

- Apply `scripts/deploy-pilgrimage-seat-allocations.sql` only after the existing operational and commercial schema is verified in a **disposable staging** project; do not paste it into production.
- If staging testing fails, drop only the temporary staging clone. Do not remove historical allocations from a production database as a rollback strategy.
- SQL implementation lives on GitHub. No Lovable usage is required for source edits or GitHub Actions testing.
