# WhatsApp internal-call repair and live verification

Recorded on 28 September 2026 (Cairo); production observations were retrieved on 27 September UTC.

## Incident and deployed repair

Inbound messages reached the webhook and were stored, but the bot's internal authentication rejected the webhook-to-bot invocation with HTTP 401 before AI generation or provider delivery. In the deployed SDK, the modern service secret was sent in `apikey`, while the handler accepted only a bearer service key or a separately configured internal secret. The SDK returned this failure as an `error` result, so the webhook's rejection-only catch did not report it.

Runtime commit: [`86ea1688218421f5649a6781f02ded6533754865`](https://github.com/sanad92/vogatchi-voyage-connect/commit/86ea1688218421f5649a6781f02ded6533754865).

- The internal auth helper now accepts an exact match to the configured modern service secret in `apikey`. Public and forged keys remain unauthorized; existing bearer and internal-secret paths remain available.
- An authenticated `dry_run: true` request verifies the real bot handler without database operations, AI generation or WhatsApp sends.
- The webhook inspects invocation errors, records diagnostic identifiers/status and routes affected unassigned, still-open conversations to the human queue. It does not overwrite closed or employee-owned conversations.
- `whatsapp-chatbot-reply`, `whatsapp-webhook` and `whatsapp-automation-engine` were deployed with the shared auth repair. The temporary diagnostic function was removed.

The deployed no-op returned HTTP 200 for an authorized internal caller and HTTP 401 for missing, public and forged credentials. No customer messages were sent by that probe.

## Production observations

Natural inbound traffic after the deployment produced the following bot replies. This is a snapshot, not a cumulative service-level guarantee.

| Business account | Read | Delivered, not yet read | Sent, delivery unconfirmed | Total with provider IDs |
| --- | ---: | ---: | ---: | ---: |
| Egypt, ending 2882 | 9 | 2 | 1 | 12 |
| Saudi Arabia, ending 1793 | 8 | 0 | 0 | 8 |
| Total | 17 | 2 | 1 | 20 |

All 20 corresponding reply interactions recorded `google/gemini-2.5-flash`. The observed replies span 27 September 17:07:14–21:43:27 UTC. The interaction log also recorded one keyword-triggered handoff and one handoff after the configured reply limit. A handoff record establishes transfer to the queue, not an employee response.

The earlier user test conversation had since been closed and was not reopened or replayed during this verification. Production success on both business accounts does not establish delivery to that particular closed conversation. Bot replies remain subject to conversation state, human ownership, handoff and messaging-window rules.

## Regression verification

`npm run test:whatsapp` passed with all three scripts:

- `verify-whatsapp-queue.mjs`: SQL claims, duplicate claims, tenant isolation, routing capacity, presence, revoked permission and guided intake.
- `verify-whatsapp-bot.mjs`: successful send, invalid inbound, duplicate handling, handoff and cancellation when an employee takes over during AI generation.
- `verify-whatsapp-internal-auth.mjs`: 11 cases through the real transpiled auth helper and bot handler, covering modern service `apikey`, legacy bearer, configured internal secret, missing/public/forged/wrong credentials, an unset internal secret and rejection of a legacy key supplied only as `apikey`.

The new auth checks assert zero database, AI and provider effects for both accepted no-op requests and rejected requests. Fixtures are fake; external operations are trapped. The local scripts do not validate the live gateway or provider network; the deployed no-op and production delivery records supply that separate evidence.
