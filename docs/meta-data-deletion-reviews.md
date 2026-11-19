# Meta data deletion reviews

Meta's [callback documentation](https://developers.facebook.com/documentation/development/create-an-app/app-dashboard/data-deletion-callback) identifies the requester by an app-scoped Facebook user ID. SafarERP verifies the callback signature, records the request, and returns a confirmation code and status link. An exact signed retry returns the original confirmation. Existing receipt links remain valid.

Platform owners can open **Meta data deletion requests** in platform administration. When someone follows up with a confirmation code, use the exact-code search to find the request. Opening a review enables access to the Meta subject identifier and records which owner viewed it. The public page displays the stage without exposing that identifier, internal references, or the audit history.

- Start a review to establish the app, subject identity, scope, and handling requirements.
- Move the request to **Verification required** when those facts remain unresolved. The public status directs the requester to the existing privacy contact.
- Record completion after the authorized handling is verified. Enter its internal evidence reference. The transaction records the owner and time and removes the raw Meta identifier from this exact receipt while retaining its status and signed-retry fingerprint.

## Data ownership boundary

The WhatsApp OAuth and manual connection paths persist company-owned WhatsApp Business accounts, phone numbers, and credentials. Conversation and message rows are associated with company inboxes and customer records rather than the app-scoped callback subject. The repository has no current trusted mapping that expands this callback into authority to delete those shared records. Intake and review therefore do not disconnect an inbox or delete its conversations, messages, CRM data, or financial records.

Staging should verify the complete callback, lookup, reviewer audit, and public receipt with test identities before deploying. Apply the database migration before updating the public page or callback function.

Run the isolated regression with `node scripts/verify-meta-deletion-confirmation.mjs`.
