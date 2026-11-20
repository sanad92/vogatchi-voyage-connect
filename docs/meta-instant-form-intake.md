# Meta Instant Forms routing

Safar ERP receives Meta lead events through `meta-lead-ads-webhook`. The endpoint verifies the original POST body with the Meta app secret. It fetches contacts from Graph with the selected Page token, matches the event's Page and form, and creates an entry in the organization's existing CRM pipeline. The stage starts at `new` with `lead_source = meta_lead_ads`.

The importer stores name, phone, email, and the campaign ID when Graph provides it. It requires a usable phone or email and ignores other answers, such as identity-document data. It records provider receipts separately, so repeated or concurrent delivery creates at most one lead. Provider or database problems return a retryable response, and previously completed events are skipped on retry. A disabled route or an inactive subscription stops imports.

## Set up an isolated test

1. Apply the migration to a staging database that has Supabase Vault and the CRM tables. Deploy `meta-lead-ads-config` and `meta-lead-ads-webhook` there. Use the existing Meta app settings to configure the staged function URL as the Page leadgen callback. Set `META_LEAD_ADS_APP_SECRET` and `META_LEAD_ADS_VERIFY_TOKEN` as Edge Function secrets.
2. Use Meta's authorized Page, form and app setup. Follow Meta's lead retrieval requirements for Page access, the relevant lead permissions, and lead access assignments. Set up the Page subscription for the `leadgen` field in Meta. The Safar ERP screen verifies that the submitted Page token corresponds to the selected Page and can see the form in its Page form list.
3. In Safar ERP, open **Institution integrations → Meta ad leads** as an owner or authorized admin. Enter the Page ID, form ID and Page access token. The token is written to Vault and can be replaced or removed. After disconnecting, the form stays reserved to the same institution until an authorized ownership transfer is handled separately.
4. Send a synthetic Meta test lead with at least one usable contact field. Confirm that the lead appears in the correct company's CRM as **New**, and that the Meta settings card shows its last-import time. Retry the same test event and check for one resulting lead. Inspect the response and connection status locally if the request fails.

The local fixture exercises the signed webhook, Graph responses and PostgreSQL import with synthetic data. It doesn't require provider credentials or reach the provider.

`node --experimental-strip-types scripts/verify-meta-lead-ads.mjs`

[Meta Webhooks signature and callback documentation](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/) · [Page leadgen fields](https://developers.facebook.com/docs/graph-api/webhooks/reference/page/) · [Meta Lead Ads retrieval guide](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving)
