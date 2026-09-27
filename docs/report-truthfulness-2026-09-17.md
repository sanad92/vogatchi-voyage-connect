# Report and telemetry integrity — local repair

Reviewed 17 September 2026. These frontend changes are local and unpushed.

## Findings and resulting behavior

`AdvancedAnalytics` and `ExpenseAnalyticsChart`, both used by application pages,
generated random monthly/weekly financial series. Fixed budgets, risk warnings
and performance percentages were presented as actual results. Other totals
combined currencies or reused the first page of operational expense rows.

Both now render `LedgerExpenseAnalytics`, using the existing
`get_income_statement_v2` report hook. Read-only inspection confirmed that the
active RPC filters by authorized company, posted journal status, entry date and
currency. Its current definition considers active chart-of-account rows; that
scope is stated in the UI. No RPC or access policy is changed here.

The component offers explicit date and currency filters and shows operating
expenses separately from cost of services. It preserves negative net amounts
and identifies them as reductions of expenses. It does not add salaries/rent
contracts a second time or apply exchange-rate conversion. Charts and a table
use the same returned accounts. There are no invented historic series, budgets,
forecasts, risk warnings or efficiency scores.

Loading, paused initial requests, errors, no company, invalid dates, empty results
and malformed/mixed-currency responses have distinct visible states. Stale data
is not displayed as the current report while a request is running or failing.

`PerformanceMonitorTab` previously showed fixed and randomly refreshed CPU,
memory, disk, connection, response-time, request, database-size and uptime
metrics. It now states that all eight measurements are unavailable because no
telemetry source is connected. This does not implement monitoring or prove an
outage; provider telemetry remains unverified.

Two active export widgets, `ReportExporter` and `ExpenseReportExporter`, also
reported successful exports without creating a file. They now offer links to
the existing income-statement, trial-balance and cash-flow pages, which contain
actual CSV download code. The links require both finance-view and export
permissions. Other formats, email delivery and scheduling are explicitly
unavailable in this widget. Destination routes and their own permission controls
remain in place. The unused `EnhancedReportExporter` is redirected to the same
component, removing its hardcoded financial summary and incomplete exporters.
No emails or exports of real customer data were performed during this repair.

## Verification

`npm run test:report-truthfulness` passed against the actual report helper,
hook and components with controlled responses. It checks signed arithmetic,
revenue exclusion, more than 50 accounts, currency rejection, date/currency
controls, organization cache keys and RPC parameters, error/empty/loading states,
report entry points, unavailable telemetry, and permission-gated export links.
Random-number generation and simulated timer calls fail the test harness.

Application typecheck and production build passed; targeted ESLint passed for
all TypeScript files changed by this report repair. The build still warns about
large chunks; no browser performance target is certified by build success.

## Still required for acceptance

- Reconcile the visible account totals and exported CSV against an independent
  accounting reference on the deployed commit, across currencies and periods.
  Review the existing report's handling of inactive accounts as part of F04.
- Verify export contents, scope and permissions using actual test accounts.
  Links to export-capable pages are not proof of successful downloaded-file
  acceptance across all reports.
- Audit the remaining reporting surfaces; this repair is not a complete
  certification of every dashboard, report or export in the repository.
- Connect a real telemetry/alerting source and demonstrate an alert on a
  controlled failure before accepting R03.

F04 and R03 remain partial. These repairs do not justify a new readiness
percentage or a confirmed launch date.
