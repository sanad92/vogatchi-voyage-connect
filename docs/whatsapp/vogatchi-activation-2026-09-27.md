# Vogatchi WhatsApp AI activation — 2026-09-27

## Recorded change

The existing Vogatchi Travel chatbot settings were updated directly in the live
project database and enabled at **2026-09-27 09:25:03 UTC / 12:25:03 Cairo**.
A subsequent database read confirmed the enabled state and all configured values.

The exact current and prior settings are in
[vogatchi-chatbot-settings-2026-09-27.json](vogatchi-chatbot-settings-2026-09-27.json).
The snapshot contains no provider tokens, API keys, or customer conversations.
It is an operational record, not a migration, seed, or automatic deployment step.
Committing or checking out this snapshot does not change live settings.

| Setting | Recorded value |
| --- | --- |
| Company | Vogatchi Travel |
| Assistant | مساعد فوجاتشي |
| Enabled / mode | true / AI |
| Model | google/gemini-2.5-flash |
| Reply limit | 8 across the conversation's history |
| Handoff on error | Enabled |
| Outside-hours-only | Disabled |
| Scope | Egyptian account ending 2882 and Saudi account ending 1793 |

The prompt identifies the assistant as AI, collects relevant travel details one
question at a time, avoids repeating supplied facts, and prohibits invented
prices, availability, booking confirmations, payment actions, or sensitive
credential requests. The initial knowledge text includes the company identity,
its registered website URL, and the service process. No website content, prices,
offers, opening hours, or commercial policies were imported.

## Scope and handoff

The reviewed chatbot function and webhook load bot settings by organization.
They do not enforce the nullable `whatsapp_settings_id` field as a per-account
scope. The current activation therefore covers both active company accounts.

Only eligible, unassigned conversations can receive bot replies. Existing
human-owned, queued, or closed conversations are not automatically reopened.
A handoff keyword such as **موظف** moves the conversation to the human queue;
the keyword path does not currently send a WhatsApp acknowledgement.
AI-mode intake completion itself does not invoke a handoff: the prompt asks the
customer to type **موظف**. The next inbound message after the reply limit also
hands off. No automatic employee routing configuration was present at inspection.

The assistant cannot create or confirm bookings, take payments, or execute
reservation changes. A staff member must complete those steps.

## Verification completed

- `npm run test:whatsapp` passed on 2026-09-27 before activation. It covers the
  existing SQL queue/intake policies and mocked bot execution, including duplicate
  suppression, human pickup during generation, and handoff.
- The current Lovable source at
  `1f90dcdf01c4db76f8824dbead06e3fa7301007e` matched the locally reviewed
  chatbot function and settings hook.
- An OPTIONS request to the bot endpoint returned HTTP 200. This confirms
  endpoint reachability only.
- Live database readback confirmed `is_enabled=true` and the saved configuration.
- No bot interaction had been recorded in the immediate post-activation check.

Real WhatsApp delivery, the AI gateway credentials/balance, and the independently
deployed function source were not verified. The earlier unpublished application
commits were not pushed or deployed as part of this activation.

## Remaining live acceptance check

Use an authorized test phone and a fresh conversation not already owned or queued
for a staff member:

1. Send a travel enquiry with some details already supplied.
2. Confirm receipt of a brief AI reply asking for one missing detail without
   inventing a price.
3. Type **موظف** and check that the conversation appears in the human queue.
4. Have a staff member claim it; confirm that further inbound messages do not
   trigger AI replies while the staff member owns it.
5. Repeat a short check on the second company number.

If no reply arrives, inspect the latest conversation state and bot/send errors
before changing ownership or retrying any existing customer messages.

## Disable or restore

Disable the company chatbot through its WhatsApp settings to stop future eligible
bot runs. Disabling is not a guarantee that a reply already in generation or
provider transit can be recalled.

The JSON snapshot's `previous_settings` object records the prior values for a
deliberate restore. Read current settings first and use an update-time guard so
a restore does not overwrite intervening edits. Do not replay the snapshot
automatically during application deployment.
