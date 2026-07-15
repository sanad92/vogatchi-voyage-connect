# Travel Template Center — Implementation Plan

A new first-class module for managing WhatsApp templates tailored to travel agencies. Built alongside the existing WhatsApp module — no breaking changes to current messaging, broadcasts, or 24-hour window logic. All new work lives under a new "مركز القوالب" (Template Center) tab and a shared library.

## 1. Data Model (new migration)

Extend `whatsapp_templates` (additive, nullable) with:
- `category_key` (text) — canonical category id (marketing, booking_hotels, flights, payments, visas, customer_service, crm_followups, seasonal)
- `subcategory` (text, nullable)
- `description` (text)
- `tags` (text[])
- `preview_variables` (jsonb) — sample data for previewing
- `variable_schema` (jsonb) — declared variables with type/source hint (customer.name, booking.reference, etc.)
- `meta_template_id` (text) — Meta side id
- `meta_status` (text) — approved/pending/rejected/paused (mirrors Meta)
- `meta_synced_at` (timestamptz)
- `meta_rejection_reason` (text)
- `usage_count` (int default 0)
- `last_used_at` (timestamptz)
- `is_library_seed` (bool default false) — marks templates from bundled library
- `library_source_key` (text) — stable id for library upserts
- `locale` (text default 'ar')

New table `whatsapp_template_analytics`:
- template_id, organization_id, date, sent_count, delivered_count, read_count, replied_count, failed_count
- Unique(template_id, date)
- Populated via trigger on `whatsapp_messages` (increments counters).

New table `whatsapp_template_suggestions_log` (optional, small):
- Records which template was suggested from which context (booking/crm/invoice) for future ML. Skip if we want to stay minimal — will implement in-memory only.

RLS: org-scoped, matches existing `whatsapp_templates` policies. GRANT statements included.

## 2. Travel Template Library (seed content)

A TypeScript module `src/data/travelTemplateLibrary.ts` shipping ~90 curated templates in Arabic + English variants, grouped by category:

- Marketing (15): seasonal offers, new destinations, flash deals, loyalty perks
- Booking & Hotels (15): booking confirmed, hotel voucher, check-in reminder, check-out thanks, upgrade offer
- Flights (12): ticket issued, schedule change, check-in open, gate change, delay, arrival
- Payments (10): payment link, reminder (D-3, D-1, overdue), receipt, refund issued
- Visas (8): documents needed, application submitted, approved, rejected, appointment reminder
- Customer Service (10): greeting, out-of-office, agent handover, satisfaction survey, review request
- CRM Follow-ups (10): lead nurture, quote follow-up, re-engagement 30/60/90 days, birthday, anniversary
- Seasonal (10): Ramadan, Eid, Hajj/Umrah, summer, winter, back-to-school, national days

Each entry: `{ key, category, locale, name, description, body, header, footer, variables[], tags[], previewVariables }`. Users import them into their org with one click; imports write to `whatsapp_templates` with `is_library_seed=true`, `library_source_key=<key>`. Re-importing is idempotent (upsert on org_id+library_source_key).

## 3. Edge Functions

- `whatsapp-sync-templates` (new): pulls templates from Meta Graph API, upserts `meta_template_id`, `meta_status`, `meta_rejection_reason`, `meta_synced_at`. Reuses appsecret_proof pattern from existing `whatsapp-list-templates`.
- `whatsapp-submit-template` (new): submits a local template to Meta for approval; stores returned id + status.
- `ai-generate-template` (new): uses existing Lovable AI Gateway (google/gemini-3.5-flash) to draft a template body from a natural-language brief + category + tone. Returns `{ name, body, header, footer, variables, suggestedCategory }`. Server-side only, uses `LOVABLE_API_KEY`.

No changes to existing send/broadcast/webhook functions.

## 4. Frontend

New route/tab inside existing WhatsApp admin: **Template Center**. Under `src/components/whatsapp/template-center/`:

- `TemplateCenter.tsx` — main shell with sidebar (categories + counts) + main pane
- `TemplateList.tsx` — grid/list with search, filters (category, status, locale, tags), sort (recent, most used)
- `TemplateCard.tsx` — name, category badge, Meta status pill, usage stats, quick actions
- `TemplateEditor.tsx` — form with header/body/footer, variable inserter, live preview, Meta submit button
- `TemplatePreview.tsx` — WhatsApp-style bubble preview (already partially exists — extract to shared)
- `VariableInserter.tsx` — grouped picker (Customer, Booking, Hotel, Flight, Invoice, Payment, Consultant, Company) with insert-at-cursor
- `TemplateLibraryDialog.tsx` — browse bundled 90-template library, filter by category/locale, "Import to my templates" (single + bulk)
- `TemplateAnalyticsPanel.tsx` — per-template chart: sent/delivered/read/replied, 30-day trend, top-performing
- `AiTemplateGeneratorDialog.tsx` — brief textarea + category select + tone + language → calls `ai-generate-template` → prefills editor
- `MetaSyncButton.tsx` — triggers `whatsapp-sync-templates`, shows last sync time
- `TemplateSuggestions.tsx` — reusable component embedded in Booking/CRM/Invoice detail pages, shows 3-5 relevant templates based on entity type + status with one-click send

Hook `useWhatsAppTemplateCenter.tsx` — extends existing `useWhatsAppTemplates` with:
- filters state
- library import mutation
- Meta sync mutation
- analytics fetch
- suggestions selector (`getSuggestionsFor(context)`)

Variable interpolation extended in `src/lib/whatsappVariables.ts` to cover hotel, flight, payment, consultant, company groups.

Suggestions integration points (minimal, additive):
- `UnifiedBookingDetails` — add `<TemplateSuggestions context={{ type: 'booking', booking }} />` sidebar block
- `CRM` lead detail — add same for CRM follow-ups
- Invoice detail — add for payment reminders

## 5. Multilingual

- `locale` column on templates ('ar' | 'en'), UI has locale filter
- Library ships each template in both languages where meaningful
- Editor has RTL/LTR toggle based on locale
- All UI strings continue in Arabic (matches existing app)

## 6. Backward compatibility

- Old `whatsapp_templates` rows keep working; new columns nullable with defaults
- Existing `TemplatesPicker`, `WhatsAppMessageComposer`, broadcast flow untouched
- New tab surfaces alongside existing "قوالب الرسائل" tab; old placeholder `WhatsAppTemplateManager` replaced by new `TemplateCenter` under same route slot

## 7. Delivery order

1. Migration (schema + analytics table + trigger)
2. Library seed file
3. Extended variables lib + interpolation
4. Hooks + edge functions
5. UI shell + list/editor/preview
6. Library dialog + AI generator
7. Analytics panel
8. Suggestion component + wiring into Booking/CRM/Invoice
9. Meta sync/submit buttons wired

## Technical notes

- Analytics counters updated via `AFTER INSERT` trigger on `whatsapp_messages` when `template_name` present; matches to template via `(org, name, language)`.
- AI generator prompts model to output strict JSON; parsed with try/catch and fallback to raw text prefill.
- Meta sync uses `appsecret_proof` (SHA256 HMAC of access_token) — same pattern already in `whatsapp-list-templates`.
- All new queries scoped by `organization_id` from `useOrgId`.
- No changes to production data: migration is additive; library import is explicit user action.
