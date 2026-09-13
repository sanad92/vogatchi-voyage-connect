# WhatsApp queue and bot release

## Included

- Agent inbox: queue, mine, all and closed views; priority/oldest-created ordering; atomic “pick up next” and individual pickup; mobile list/chat navigation; customer panel and intake summary.
- Organization routing: manual (default), automatic, or hybrid; one capacity limit per organization; live employee availability with a 90-second heartbeat expiry. Automatic routing selects the least-loaded eligible active employee, then the least recently assigned.
- Database claims and routing share an organization lock. Claims and assignment history commit together. Assignments use employee IDs; history records identify the acting user.
- Human send endpoint checks company permissions and conversation ownership. Admin replies pause the bot; assigned employees can reply to their own conversations.
- AI replies use the organization's maintained knowledge text. A separate guided mode collects destination, dates, travelers, budget/currency and preferences, preserves answers, and hands over to the queue.
- Bot replies use the shared provider sender, enforce the messaging window, reserve a unique outbound key, and recheck human ownership immediately before sending. Retried inbound webhooks do not rerun automation. Existing handoff/status/priority survive new inbound messages.
- Admin tabs grouped by channels/service, bot/automation, templates, campaigns, team/routing and analytics. Loading failures are shown explicitly.

## Deployment order

1. Apply `supabase/migrations/20260910224026_whatsapp_queue_routing.sql` through the project's normal migration mechanism.
2. Deploy `whatsapp-chatbot-reply`, `whatsapp-webhook`, `whatsapp-queue-dispatch`, `send-whatsapp-message`, and `whatsapp-automation-engine` with their shared imports.
3. Publish the frontend after the backend is available. GitHub upload alone does not prove database/function deployment.
4. Link each agent's profile to an active employee in the same organization. Enable the required WhatsApp and customer-service permissions. Routing remains manual unless an administrator explicitly changes it.
5. Test with an authorized staging number before turning on automatic routing or bot replies for customers.

## Verification

`npm run test:whatsapp` runs SQL behavior against embedded PostgreSQL (PGlite) and mocked Edge Function behavior, without sending provider messages. It checks claim conflicts, cross-organization rejection, capacity, stale presence, permission revocation, guided intake and bot cancellation during AI generation. PGlite runs one connection; this is not a multi-connection load test.

The migration was also executed against the project's real schema inside an explicit transaction and rolled back. This checks compatibility without deploying it. The first dry run exposed an ambiguous employee-ID reference; the reference and test fixture were corrected, and the second dry run succeeded.

## Boundaries / follow-up

- No real WhatsApp delivery or production browser session was used during development.
- Queue ordering uses conversation creation time, not a separate queue-entry timestamp.
- Routing is organization-wide. Department/skill queues, offered-work acceptance timers, SLA reassignment and a dedicated supervisor dashboard are follow-up work.
- Available agents receive direct assignment. Going offline prevents new assignments after heartbeat expiry; it does not return already-owned conversations to the queue.
- The AI is a customer-service assistant, not an autonomous booking/payment agent. Maintained knowledge text is not document retrieval or verified live pricing.
- Guided intake is one sequence per conversation; reopened conversations go to humans. AI reply limits cover the full conversation history.
- The provider network call cannot be recalled after it starts. The ownership check cancels generation if a pickup is observed before send; it is not a guarantee against a pickup in the final network-send interval.
- Unique outbound keys prevent automatic retries after ambiguous provider failures. Such failures need human review. Durable webhook job replay and per-conversation AI serialization remain follow-up work.
- Outside-hours-only bot settings fail closed because no business-hours calendar is implemented. Existing external automation send actions and provider credentials require separate end-to-end validation.
