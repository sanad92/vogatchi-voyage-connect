
# Booking Automation Engine

Goal: make the **Booking** the master transaction. On booking creation (direct or from an accepted quote), atomically generate a linked set of downstream artifacts, expose them in the Booking Workspace, track completion, and allow safe reruns/retries.

## 1. Data model (single migration)

New table `booking_automation_runs` (one per booking, upserted):
- `booking_id` (unique), `organization_id`
- `status` (`pending` | `partial` | `completed` | `failed`)
- `completion_score` int (0–100)
- `last_run_at`, `error_message`

New table `booking_automation_steps`:
- `run_id` FK, `booking_id`, `organization_id`
- `step_key` (`invoice`, `supplier_po`, `voucher`, `receivable`, `payable`, `profit`, `timeline`, `messaging_suggestions`)
- `entity_type`, `entity_id` (link to created record)
- `status` (`pending` | `completed` | `failed` | `skipped`)
- `idempotency_key` UNIQUE per (booking_id, step_key, entity_key)
- `error_message`, `attempts`, `last_attempt_at`

New table `supplier_payment_orders` (Supplier Payment Order = PO to pay supplier):
- `booking_id`, `organization_id`, `supplier_id`, `service_type` (hotel/flight/transfer/visa/insurance/activity/other)
- `reference_number`, `amount`, `currency`, `due_date`
- `status` (`draft`|`approved`|`paid`|`cancelled`)
- `source_type`, `source_id` (link back to hotel_bookings/flight_bookings/etc.)
- UNIQUE (booking_id, source_type, source_id) → idempotency

New table `booking_vouchers`:
- `booking_id`, `organization_id`, `voucher_number` (unique), `qr_payload`, `issued_at`, `pdf_url` (nullable)

New table `booking_financial_snapshots` (non-accounting; tracks receivable/payable/profit):
- `booking_id` UNIQUE, `organization_id`
- `receivable_amount`, `payable_amount`, `expected_profit`, `expected_margin_pct`
- `snapshot_at`

New table `messaging_suggestions`:
- `booking_id`, `organization_id`, `channel` (`whatsapp`|`email`), `template_key`, `template_variables jsonb`, `status` (`suggested`|`sent`|`dismissed`)

All tables: standard GRANTs, RLS scoped by `organization_id` via existing helpers, `updated_at` trigger where relevant.

## 2. Server: single RPC `run_booking_automation(p_booking_id uuid)`

SECURITY DEFINER, idempotent, transactional. Steps in order, each wrapped in a BEGIN/EXCEPTION block writing to `booking_automation_steps`:

1. Load booking + related detail rows (hotel/flight/transport/car).
2. **Invoice**: if none linked to booking_id → create via existing `invoices` table using booking totals; else skip.
3. **Supplier POs**: for each supplier attached (from hotel_bookings, flight_bookings, transport_bookings, car_rentals) → upsert `supplier_payment_orders` on (booking_id, source_type, source_id).
4. **Voucher**: if none → generate `voucher_number` = `V-<booking_reference>`, `qr_payload` = JSON with booking_id + reference + customer + dates.
5. **Financial snapshot**: recompute receivable = invoice remaining; payable = sum(PO amounts unpaid); expected_profit = selling − cost; margin = profit/selling*100.
6. **Timeline events**: insert `booking_timeline_events` entries for any newly created artifact (dedup by `event_type`+`entity_id`).
7. **Messaging suggestions**: seed suggestions ("booking_confirmation" WA + email; "payment_reminder" if balance > 0; "voucher_ready" if voucher created).
8. Compute `completion_score` = weighted % of successful steps; write `booking_automation_runs`.

Trigger `AFTER INSERT ON bookings` and `AFTER UPDATE ON quotes WHEN status='accepted'` → `PERFORM run_booking_automation(...)`. Safe on rerun.

Second RPC `retry_booking_automation_step(p_step_id uuid)` to retry a single failed step.

## 3. Frontend

New hook `useBookingAutomation(bookingId)` — reads run + steps + linked artifacts, exposes `runNow()` and `retryStep()`.

New components under `src/components/bookings/workspace/automation/`:
- `AutomationCenter.tsx` — shows run status, completion score gauge, list of steps grouped by Completed / Pending / Failed with per-row Retry.
- `CompletionScoreBadge.tsx` — used in Executive Header.
- `SupplierPOList.tsx`, `VoucherCard.tsx`, `MessagingSuggestionsList.tsx`.

Integration:
- Add **Automation** tab to `BookingWorkspace.tsx`.
- Surface completion score in `WorkspaceExecutiveHeader`.
- Add supplier POs section under Financials tab; voucher under Documents tab; messaging suggestions under WhatsApp tab.
- Extend `useQuoteConversion` to call `runNow()` right after booking creation (best-effort; trigger is authoritative).

## 4. Idempotency & safety

- UNIQUE constraints on all natural keys (invoice per booking, PO per source row, voucher per booking, snapshot per booking, timeline dedup).
- All step writes use `ON CONFLICT DO NOTHING` / upsert; step ledger records `skipped` when already present.
- No accounting journal entries created (explicit non-goal).
- Preserves existing invoice/PO flows: hook creation is additive, existing manual creates still work.

## 5. Validation

- Run automation on an existing booking (rerun-safe check).
- Convert a quote → verify invoice, POs (one per supplier), voucher, snapshot, timeline events, and suggestions all appear in the Workspace's Automation tab, and completion score = 100.
- Simulate a supplier missing to confirm partial status + retry button works.

## Deliverables

- 1 migration
- ~5 new tables + 2 RPCs + 2 triggers
- 1 hook + ~5 new components
- Workspace tab + header badge + section integrations
- No breaking changes to existing pages or flows
