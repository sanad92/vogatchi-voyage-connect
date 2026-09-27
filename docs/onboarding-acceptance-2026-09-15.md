# S02: New-company onboarding repair

Baseline: `aad09467b9c2332d90c682b77cb45ce28666a52a`.

The wizard wrote `website` to `organizations`, although that field belongs to
`organization_settings`. Supabase errors were ignored, failed steps advanced,
and the final step inserted an incomplete legacy hotel booking.

This change saves company fields to the existing settings table and requires a
confirmed row for every write. Existing settings are loaded before editing;
unrelated fields such as the logo are not included in the update. Errors keep
the current form visible, with retry and explicit skip actions.

Employee and customer creation reuse an opaque UUID stored in session storage
for the same organization, user and record kind. Retry and back-edit update the
same row. No personal form data is stored there. If session storage is unavailable,
creation fails visibly before a write; the user can explicitly skip the step.
This protection covers retries in the same browser tab/session, not arbitrary
new sessions or independently created records by other users.

The final action confirms onboarding completion and then opens `/bookings/new`,
where customer, services, suppliers and prices are entered through the existing
booking flow. Skipping opens the dashboard. The wizard no longer creates bookings.
The form remounts on company/user changes, ignores late UI callbacks after
unmount, and blocks concurrent clicks while a write is pending.

## Validation

- `npm run test:onboarding`: 14 behavioral checks passed, exercising the actual
  persistence helpers and component handlers with simulated server responses.
- `npm run test:company-core`: existing organization/permission checks passed.
- `npm run build`: passed.
- ESLint for `src/lib/onboarding.ts` and `src/pages/OnboardingWizard.tsx`: passed.
- App TypeScript check still fails: 23 diagnostics in 13 unrelated files,
  compared with 24 diagnostics in 14 files at baseline. The onboarding diagnostic
  is resolved. This is not a clean global type-check result.

## Remaining acceptance evidence

S02 is **locally verified; deployed acceptance pending**. On a disposable company
in an authorized test environment, an owner/admin must complete setup, reload
settings, retry interrupted employee/customer creation, finish via both paths,
and create a complete booking from the canonical form. Repeat with denied
permissions, a missing settings row, existing logo/settings and a second company.
Record the deployed commit and check stored rows, ownership and navigation.

No schema migrations, production data changes, browser acceptance, live RLS
certification or frontend deployment were performed for this repair. The existing
onboarding redirect behavior for non-admin members and broader employee RLS
policies remain part of A01/A02/S02 acceptance. This patch does not certify them.
