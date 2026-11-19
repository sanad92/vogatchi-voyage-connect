# Safar ERP isolated schema bootstrap checkpoints

A new database needs objects from Supabase migration history, selected Drizzle migrations, and the reviewed deployment SQL under `scripts/`. Keep the applied migration files and version numbers intact. Use a disposable local database with the Supabase Auth and Storage schemas and synthetic data.

## Reproduce the dependencies without connecting to a database

From the repository root with dependencies installed, run:

```sh
node scripts/verify-historical-migration-prerequisites.mjs
```

The test starts an in-memory PostgreSQL instance with a minimal fixture schema. It runs the actual attachment and FIT migrations and the unchanged function-patching blocks from the booking migrations. It verifies the missing-object errors, installs the repository's prerequisite SQL, and repeats each operation. It also checks that the converted-quote guard gets its cancellation exception and that both creation routines acquire cancellation-terms support.

## Order to validate on a disposable Supabase instance

Advance the recorded Supabase migration history to each checkpoint on the same local database, with seeding disabled. At each checkpoint, apply the listed SQL before continuing and stop on the first error. Reset only before the first stage so the earlier prerequisites stay available to the later stages.

| Before this Supabase migration | Required repository SQL and checks | Evidence |
| --- | --- | --- |
| `20261113145246_private_operational_attachments.sql` | Apply Drizzle `0006_support_tickets_and_pilgrimage.sql`, then `0010_pilgrimage_operations.sql`. Confirm `public.pilgrims` and `public.support_tickets` exist. Before the later pilgrimage guardrails, confirm the customer payments pilgrim link from `0010` as well. | The attachment migration failed with `42P01` for `public.pilgrims`, then succeeded after applying both real Drizzle files in the fixture. |
| `20261113145843_pilgrimage_fit_supplier_confirmation.sql` | Apply `scripts/deploy-pilgrimage-sales-models.sql`. Confirm `public.pilgrimage_sale_items` and `public.pilgrimage_sales` exist, including their composite organization keys. | The FIT migration failed with `42P01` for `public.pilgrimage_sale_items`, then succeeded with the actual sales schema installed. |
| `20261113185820_pilgrimage_operations.sql` | Install `scripts/deploy-pilgrimage-guardrails.sql` after its stated Drizzle prerequisites. Check `public._pilgrimage_pilgrim_integrity()` and `public._pilgrimage_payment_integrity()` before the migration patches their definitions. | These functions are created in the guardrails script. The full historical transition still needs a local replay. |
| `20261113233232_pilgrimage_program_sales_confirmation.sql` and `20261113233607_pilgrimage_agency_portal.sql` | Apply `deploy-pilgrimage-seat-allocations.sql` and `deploy-pilgrimage-b2b-agreements.sql` after the sales models. The agency portal also needs the roster and receivables scripts. Before the availability functions are exercised, verify the private availability helpers from `deploy-pilgrimage-availability-search.sql` and its stated passenger and settlement prerequisites. | The migrations address the preexisting tables and patch the original roster function. The local B2B settlement harness provides a working isolated schema order for testing these components. |
| `20261113234804_full_booking_supplier_cancellation.sql` | Install `scripts/deploy-atomic-booking.sql` and `scripts/deploy-quote-conversion.sql`. Quote conversion assumes atomic quote creation, already versioned in `20260924105205_2fb4cd6b-8ac0-414d-a447-6266e5c841c4.sql`. The isolated fixture installs its script equivalent. | The supplier-cancellation migration skips its converted-quote guard patch when `guard_quote_conversion_links()` is absent. The fixture verifies that the patch lands when quote conversion is installed first. |
| `20261113235821_booking_cancellation_terms_and_payment_schedule.sql` | Verify `create_booking_atomic(uuid,uuid,jsonb)` and `convert_quote_atomic(uuid,uuid)` exist from the previous checkpoint. Verify that the functions retain the expected definitions from the original deployment scripts. | The exact creation patch failed with `42883` for each missing function. Both patched definitions contained cancellation terms when their prerequisites were installed. |

After applying the remaining migration history, use synthetic tenant fixtures to verify the booking, quote conversion, supplier cancellation, and agency portal flows. The in-memory check covers the recorded failures and the relevant prerequisite SQL. A complete from-empty replay, the intermediate pilgrimage checkpoints, and the resulting schema's compatibility with the full Drizzle history still require verification in a disposable Supabase stack.

The quote conversion deployment script redefines `normalize_booking_financials()`, `sync_booking_financials(uuid)`, and the conversion guard. These checkpoint instructions apply to a disposable schema before downstream patches. Applying the same script to an up-to-date database could replace later accounting changes.
