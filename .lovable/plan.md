## Root cause (confirmed)

The database trigger function `public.trg_emit_booking`, which runs on every `bookings` UPDATE, compares the enum column against an empty text literal:

```text
IF coalesce(NEW.workflow_stage,'') IS DISTINCT FROM coalesce(OLD.workflow_stage,'') THEN
  ...
  'booking.stage_changed:'||NEW.id::text||':'||coalesce(NEW.workflow_stage,'')
```

`coalesce(<booking_workflow_stage>, '')` forces the literal `''` to be coerced to `booking_workflow_stage`, which Postgres rejects with exactly:
`invalid input value for enum booking_workflow_stage: ""`.

So the failure happens inside the UPDATE issued by `advance_workflow`, after its own validation passes — which is why the message is the raw Postgres enum error and not the function's Arabic "invalid booking workflow stage" message. No frontend code writes `workflow_stage` directly; the UI path (`StageStepper` → `useBookingWorkspace.setStage` → `advance_workflow`) is already guarded.

Secondary, currently latent: `handler_workflow_rules` and `_workflow_run_step` cast `action ->> 'to'` / `step ->> 'to'` to the enum without a null/empty guard, so a rule saved with a blank target stage would raise the same error inside the event bus. The only active rule today is a `log_only` rule, so this is not the current trigger of the bug but should be hardened in the same pass.

## Changes (single migration, no new features)

1. Rewrite `public.trg_emit_booking`:
   - stage comparison becomes `NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage` (no coalesce on the enum)
   - idempotency key uses `coalesce(NEW.workflow_stage::text, '')`
   - `status` handling stays unchanged (it is a text column, so its coalesce is safe)
2. Harden `_workflow_run_step` and `handler_workflow_rules`: only run the `advance_stage` UPDATE when `nullif(btrim(step ->> 'to'), '')` is non-null and is a valid `booking_workflow_stage` label; otherwise log a skipped timeline/rule-run entry instead of raising.

No frontend changes required.

## Verification

- Run a stage change on booking `e9133c6a-0c62-4999-9c6a-2a1474b212af` via the `advance_workflow` RPC and confirm it succeeds.
- Confirm `bookings.workflow_stage` persisted, a `booking.stage_changed` row exists in `domain_events`, a `stage_changed` row exists in `booking_timeline_events`, and the related `event_deliveries` rows reach `succeeded` with no `last_error`.
- Confirm a plain non-stage update to the same booking (e.g. `notes`) no longer errors.
