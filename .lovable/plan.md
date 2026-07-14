# Smart WhatsApp 24h Window + Auto Template Fallback

Goal: Never let a freeform message hit Meta when the customer is outside the 24h customer-service window. Detect the window client-side, show a clear status badge, and auto-open a Template Picker (grouped by category, variables pre-filled) when required.

## 1. Window detection hook — `src/hooks/useWhatsAppWindow.tsx` (new)

Computes the "last inbound message" timestamp for a conversation and derives:
- `lastInboundAt: Date | null`
- `isWindowOpen: boolean` (now − lastInboundAt < 24h)
- `minutesRemaining: number`
- `expiresAt: Date | null`

Source of truth: query `whatsapp_messages` where `conversation_id = X AND direction = 'inbound'` order by `sent_at desc limit 1`. Subscribes to realtime inserts on that conversation so the badge flips instantly when a new inbound arrives. Re-evaluates every 60s via a `useState` tick.

## 2. Status badge — `src/components/whatsapp/WindowStatusBadge.tsx` (new)

Two visual states:
- Open: green badge "نافذة الرد مفتوحة · متبقي Xس Ym" — freeform allowed.
- Closed: amber badge "نافذة الرد مغلقة · مطلوب قالب معتمد" — freeform blocked.

Tooltip explains Meta 24h rule + error 131047.

## 3. Composer integration — `src/components/whatsapp/WhatsAppMessageComposer.tsx`

- Accept `isWindowOpen` prop (parent supplies from `useWhatsAppWindow`).
- Render `WindowStatusBadge` above textarea.
- When closed:
  - Textarea placeholder: "نافذة 24 ساعة مغلقة — استخدم قالباً معتمداً".
  - Send button intercepts: instead of calling `sendTextMessage`, opens the Template Picker (controlled `open` state) and shows a toast: "لا يمكن إرسال رسالة حرة الآن — اختر قالباً".
  - Media send also blocked with same guidance (Meta requires template session too).
- When open: behavior unchanged.

The interception happens BEFORE `supabase.functions.invoke`, so no request reaches Meta.

## 4. Template Picker upgrade — `src/components/whatsapp/TemplatesPicker.tsx`

- Group approved templates by category with these buckets (map by template.category or name prefix):
  - Booking, Payments, Hotels, Flights, CRM Follow-up, Marketing, Other.
- Add `autoOpen` + `onOpenChange` props so composer can force-open it.
- Add `onSendDirect` prop: when set (closed-window mode), clicking a template calls it instead of just filling text — parent sends the template via edge function immediately.
- Only show `status === 'approved'` when in closed-window mode (freeform mode keeps current behavior).

## 5. Send template directly — extend `useWhatsAppMessaging`

Add `sendTemplate(conversationId, template, variables)` that calls `send-whatsapp-message` edge function with:
```
{ conversationId, messageType: 'template', templateName, templateLanguage, templateComponents: [...] }
```
(The function already supports template type; we just pass the payload.) On success it inserts an outbound row with `message_type='template'`.

## 6. Variable prefill

`useWhatsAppWindow` returns `variableContext` built from:
- Customer: name/phone via `whatsapp_conversations.customer_id → customers`.
- Latest booking: query `bookings` where `customer_id = X` order by created_at desc limit 1 → booking_reference, destination, dates.
- Latest invoice: `invoices` limit 1 → invoice_number, total, currency.
- Agent + org: from existing auth hooks.

Merged into `VariableContext` and passed to TemplatesPicker so `interpolateVariables` fills `{{booking_ref}}`, `{{invoice_total}}`, etc. Unknown vars stay as-is.

## 7. UI status in conversation list (optional, low cost)

Small dot on each conversation row using the same hook (per-row) — green/amber — so agents scanning the list see who needs templates. Wire only if the existing conversation list component is small; otherwise defer.

## 8. Files touched

New:
- `src/hooks/useWhatsAppWindow.tsx`
- `src/components/whatsapp/WindowStatusBadge.tsx`

Edited:
- `src/components/whatsapp/WhatsAppMessageComposer.tsx`
- `src/components/whatsapp/TemplatesPicker.tsx`
- `src/hooks/useWhatsAppMessaging.tsx`
- `src/lib/whatsappVariables.ts` (add booking/invoice keys to `AVAILABLE_VARIABLES`)
- Parent(s) that render `WhatsAppMessageComposer` — pass conversationId + wire window hook (likely `WhatsAppConversationDetail.tsx` and `useCustomerWhatsApp` consumer). Minimal prop threading.

## 9. Non-goals / preserved

- No schema changes, no migrations, no RLS changes.
- Existing broadcast pipeline untouched.
- `send-whatsapp-message` edge function untouched (already supports template type).
- Business logic for messaging, storage, realtime — unchanged.

## 10. Verification

- Manually: open a conversation where last inbound > 24h → badge amber, textarea disabled, clicking Send opens template picker, choosing template sends and appears in thread as outbound template. Conversation with recent inbound → badge green, freeform works.
- Confirm no network call to `send-whatsapp-message` with `messageType:'text'` while window is closed (check network tab).
