# Transactional email dispatch

The legacy email dispatch queue now accepts approved server work from organization onboarding, customer registration rules, and confirmed bookings. The worker checks the recipient and relevant record again before sending. Invitation and authentication email hooks continue to use their existing paths. Historical queue records and other event producers, including legacy staff notifications, require review before delivery.

## Staging

1. Start with a clean isolated staging project. For a restore rehearsal, disable cron and external egress before restoring source data, then replace the copied Vault values and inspect restored jobs before re-enabling cron. Apply the queue migration and deploy `process-email-queue`, `send-email`, `send-welcome-email`, and `send-booking-confirmation` with their shared code. Publish the compatible onboarding UI to the same staging environment.
2. In the staging project Vault, set `email_queue_project_url` to the staging Supabase origin and `email_queue_service_role_key` to that project's privileged function credential. The cron job sends no HTTP request without both settings.
3. Configure a verified test sender where applicable with `EMAIL_QUEUE_FROM`. Configure the staging Resend credential and set `EMAIL_QUEUE_DISPATCH_ENABLED=true` once the sender and recipient are controlled test addresses.
4. The migration creates the job paused. Enable `process-email-queue-every-minute` in the staging project's Cron dashboard after verifying its URL and Vault values. Use an isolated company and controlled inboxes to check a welcome email, customer registration rule, and confirmed booking. Repeat the same booking confirmation and verify one queue item and one provider record.
5. Check the worker result and timestamps. A queue item marked `sent` records provider acceptance. Verify receipt separately in the controlled inbox. Investigate `needs_review` against the provider before sending again.
6. To pause new provider attempts, remove `EMAIL_QUEUE_DISPATCH_ENABLED` or set it to `false`.

The worker claims up to six items per run, observes the retry schedule, and uses one Resend idempotency key per queue item. Stale attempts use the original key within a one-hour window. After that, a possible prior send goes to review.

[Supabase scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions) · [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
