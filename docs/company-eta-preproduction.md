# ETA invoice sample in preproduction

An organization owner or permitted admin can connect their own ETA test credentials under **Company API Integrations**. Open the ETA sample history, paste the JSON submission envelope containing one signed invoice v1.0, and submit it. Use synthetic invoice data and an issuer certificate accepted by preproduction.

- The test uses ETA’s preproduction identity and invoicing hosts. The saved production connection is ineligible.
- An ETA HTTP 202 response records its submission and document references as awaiting validation. Use **Check sample status** to verify those same references against ETA.
- The stored receipt contains the internal reference, provider references, status, timestamps and the request digest. The signed document body, provider details, and authentication credentials are absent from the receipt.
- A pre-authentication failure allows a retry with the same file. An unconfirmed POST is retained as unknown and will not be replayed. Check the ETA test portal for that sample before preparing a replacement. Continue status checks on the same connection revision used to send the sample.
- The feature neither generates the signed payload nor uses operational invoices from Safar ERP. The existing ZATCA connection continues to verify signed samples through the compliance simulation. Production invoice generation, taxpayer signing and jurisdiction-specific reporting or clearance need separate staged verification.

## Local verification

Run `node scripts/test-company-api-connections.mjs` and `bun supabase/functions/_shared/company-eta-preprod.test.ts`. The SQL fixture uses a Vault test double and the Edge contract uses mock provider responses. Provider credentials, real test certificates, and access to a provisioned preproduction tenant are required for the external smoke test.

## Provider specifications

- [ETA document submission and synchronous acceptance](https://sdk.invoicing.eta.gov.eg/einvoicingapi/01-submit-documents/)
- [ETA submission status and document summary](https://sdk.invoicing.eta.gov.eg/einvoicingapi/09-get-submission/)
- [ETA signing, canonicalization and submission envelope](https://sdk.invoicing.eta.gov.eg/signature-creation/)
- [ETA preproduction endpoints and trust setup](https://sdk.invoicing.eta.gov.eg/faq/)
- [ZATCA Fatoora simulation and production paths](https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/Fatoora_Portal_User_Manual_English.pdf)
