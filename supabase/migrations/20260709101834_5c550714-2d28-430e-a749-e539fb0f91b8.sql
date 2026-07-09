
-- 1) Normalize existing phone_numbers
UPDATE public.whatsapp_conversations
SET phone_number = public.normalize_phone_digits(phone_number)
WHERE phone_number IS DISTINCT FROM public.normalize_phone_digits(phone_number);

-- 2) Merge duplicate conversations (keep earliest per org+phone)
WITH ranked AS (
  SELECT id, organization_id, phone_number, customer_id,
         FIRST_VALUE(id) OVER (
           PARTITION BY organization_id, phone_number
           ORDER BY created_at ASC, id ASC
         ) AS keep_id,
         FIRST_VALUE(customer_id) OVER (
           PARTITION BY organization_id, phone_number
           ORDER BY (customer_id IS NULL), created_at ASC
         ) AS best_customer_id
  FROM public.whatsapp_conversations
)
UPDATE public.whatsapp_messages m
SET conversation_id = r.keep_id
FROM ranked r
WHERE m.conversation_id = r.id AND r.id <> r.keep_id;

-- Backfill customer_id onto the surviving conversation when possible
WITH ranked AS (
  SELECT id, organization_id, phone_number,
         FIRST_VALUE(id) OVER (
           PARTITION BY organization_id, phone_number
           ORDER BY created_at ASC, id ASC
         ) AS keep_id,
         FIRST_VALUE(customer_id) OVER (
           PARTITION BY organization_id, phone_number
           ORDER BY (customer_id IS NULL), created_at ASC
         ) AS best_customer_id
  FROM public.whatsapp_conversations
)
UPDATE public.whatsapp_conversations c
SET customer_id = COALESCE(c.customer_id, r.best_customer_id)
FROM ranked r
WHERE c.id = r.keep_id AND r.best_customer_id IS NOT NULL;

-- Delete duplicate conversation rows
WITH ranked AS (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY organization_id, phone_number
           ORDER BY created_at ASC, id ASC
         ) AS keep_id
  FROM public.whatsapp_conversations
)
DELETE FROM public.whatsapp_conversations c
USING ranked r
WHERE c.id = r.id AND r.id <> r.keep_id;

-- 3) Remove duplicate messages by (organization_id, message_id)
DELETE FROM public.whatsapp_messages a
USING public.whatsapp_messages b
WHERE a.organization_id = b.organization_id
  AND a.message_id = b.message_id
  AND a.message_id IS NOT NULL
  AND a.ctid > b.ctid;

-- 4) Unique indexes to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_org_phone_uidx
  ON public.whatsapp_conversations (organization_id, phone_number);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_org_msgid_uidx
  ON public.whatsapp_messages (organization_id, message_id)
  WHERE message_id IS NOT NULL;

-- 5) Trigger: always store phone_number in normalized digits-only form
CREATE OR REPLACE FUNCTION public.trg_wa_normalize_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL THEN
    NEW.phone_number := public.normalize_phone_digits(NEW.phone_number);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_conversation_normalize_phone ON public.whatsapp_conversations;
CREATE TRIGGER trg_wa_conversation_normalize_phone
BEFORE INSERT OR UPDATE OF phone_number ON public.whatsapp_conversations
FOR EACH ROW EXECUTE FUNCTION public.trg_wa_normalize_phone();
