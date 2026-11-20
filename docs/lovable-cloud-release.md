# Safar ERP release on Lovable Cloud

The remaining candidate is [PR #130](https://github.com/sanad92/vogatchi-voyage-connect/pull/130). Production work already merged into `main` includes [#131](https://github.com/sanad92/vogatchi-voyage-connect/pull/131), [#132](https://github.com/sanad92/vogatchi-voyage-connect/pull/132), [#133](https://github.com/sanad92/vogatchi-voyage-connect/pull/133), [#134](https://github.com/sanad92/vogatchi-voyage-connect/pull/134), and [#135](https://github.com/sanad92/vogatchi-voyage-connect/pull/135). Verify the candidate head and the active production branch before release. Git sync updates the production editor. Lovable's publish controls serve the website snapshot. Apply and verify the matching backend changes through the Cloud backend controls before publishing a website that depends on them.

The outstanding comparison against `main` identifies eight migration files. Coordinate each group with its matching Edge functions and any required provider settings. The production checkout and its approved Paymob configuration serve platform subscriptions. The Paymob staging backend is for sandbox subscription testing.

| Change | Migration versions | Runtime dependency |
| --- | --- | --- |
| Subscription checkout status and retry behavior | `20261119230811`, `20261119231213` | Matching `create-payment` and `paymob-webhook` builds |
| WhatsApp scheduled follow-ups | `20261119231256` | `whatsapp-scheduler` on the ERP backend |
| Registration deduplication and transactional email processing | `20261119231632`, `20261119234806` | Matching queue worker, sender and confirmation functions with the approved mail configuration |
| Meta deletion request processing | `20261119234820` | Matching `whatsapp-data-deletion` callback with verified Meta configuration |
| ETA preproduction sample receipts | `20261119234911` | Matching `company-api-integrations` build and ETA preproduction configuration |
| Meta Instant Form CRM intake | `20261120002308` | Matching `meta-lead-ads-config` and `meta-lead-ads-webhook` builds and company provider configuration |

The WhatsApp ad-first intake webhook in [#128](https://github.com/sanad92/vogatchi-voyage-connect/pull/128) also needs its own Cloud deployment. The browser's manual WhatsApp intake and the public read-only Meta receipt check were already released and use the production database.

## Prepare the ERP test target on Lovable Cloud

1. Record the exact candidate commit and CI result. Keep the production Lovable project on its current branch while testing. Use a separate, unpublished Lovable project with its own built-in Cloud backend, separate users and synthetic companies. In the Lovable controls, verify the project identity, database status and API origin. Check the actual preview API origin before the first sign-in, RPC or upload.
2. If creating that project from GitHub code, Lovable supports **Import project → Upload code**. Lovable Git sync creates a new repository for the new project. In the archive, omit the tracked `.env` and any other `.env` files, dependency folders and build output. Review the importer changes against the candidate commit. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the test backend. Confirm the project identity in `supabase/config.toml` targets the test environment before using any deployment command.
3. Install and verify the ERP test schema before exercising the candidate. Use the [historical schema checkpoints](isolated-schema-bootstrap-checkpoints.md) and [database restore drill](isolated-database-restore-rehearsal.md). A fresh replay needs the reviewed legacy file ordering, extension support and seed review. Inspect cron jobs and SQL for fixed production project URLs before enabling schedules. Keep outbound integrations disabled until their separate tests have dedicated provider credentials, test destinations and a verified API origin.

The project preview and active Git branch do not establish database isolation. A Lovable draft can share production data. Even a draft with example data uses the parent project's live secrets and connectors. For this drill, use a separately identified Cloud backend and dedicated test credentials.

## Paymob sandbox subscription check

The existing Paymob staging project is for Safar ERP subscription checkout and activation. Validate it with the authentication, organization and subscription billing schema required by the checkout. ERP fixtures for bookings, pilgrimage, company finance and email belong in the separate Lovable Cloud test target.

1. In the Paymob dashboard's **Test** mode, select the sandbox card integration and confirm its callback and redirect target the test environment. Configure the test-only secret/public key pair and HMAC in Lovable's secret settings. Set `PAYMOB_INTEGRATION_ID` explicitly, and set `PAYMOB_WALLET_INTEGRATION_ID` only for a verified sandbox wallet integration. The current checkout has a fallback when explicit IDs are missing, so verify the expected ID in the Paymob test dashboard before opening checkout. Keep configuration values out of logs and reports.
2. Deploy the candidate subscription billing schema and matching `create-payment`, `paymob-webhook` and relevant billing functions to the Paymob test backend. Use a restricted preview bound to that backend and confirm the webhook URL uses it. Use a synthetic company, test card and Paymob Test activity only.
3. Verify a pending subscription before callback acceptance. Complete checkout and confirm the signed callback matches the expected intention, amount and currency. Confirm subscription activation, redirect status, duplicate callback handling and retry behavior. Also check that a cancel or failure leaves the subscription unactivated. Repeat plan and company checks before considering the result ready for release.

Record the tested candidate SHA, isolated project identifier, provider mode, expected and observed subscription outcomes and callback references. Code merge, migrations, and production publish require their own release decision.

[Lovable Git sync](https://docs.lovable.dev/integrations/github) · [Lovable code import](https://docs.lovable.dev/features/projects/import-project) · [Lovable draft backends and secrets](https://docs.lovable.dev/features/drafts) · [Lovable publishing](https://docs.lovable.dev/features/publish) · [Paymob Test and Live integration settings](https://developers.paymob.com/paymob-docs/need-help/setup-guides/getting-integration-credentials)
