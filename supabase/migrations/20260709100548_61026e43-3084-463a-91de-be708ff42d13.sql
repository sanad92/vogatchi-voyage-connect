
-- 1) Helper: strip non-digits (used to compare phones from CRM vs WhatsApp)
CREATE OR REPLACE FUNCTION public.normalize_phone_digits(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(_phone,''), '\D', '', 'g'), '')
$$;

-- 2) When a WhatsApp conversation is inserted/updated, auto-link to a matching customer
CREATE OR REPLACE FUNCTION public.trg_wa_conversation_autolink_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text;
  v_customer_id uuid;
BEGIN
  IF NEW.customer_id IS NOT NULL OR NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_phone := public.normalize_phone_digits(NEW.phone_number);
  IF v_phone IS NULL OR length(v_phone) < 8 THEN
    RETURN NEW;
  END IF;

  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.organization_id = NEW.organization_id
    AND public.normalize_phone_digits(c.phone) = v_phone
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    NEW.customer_id := v_customer_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wa_conversation_autolink_customer ON public.whatsapp_conversations;
CREATE TRIGGER wa_conversation_autolink_customer
BEFORE INSERT OR UPDATE OF phone_number, organization_id
ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.trg_wa_conversation_autolink_customer();

-- 3) When a customer is inserted/updated, link any orphan conversations with the same phone
CREATE OR REPLACE FUNCTION public.trg_customer_autolink_wa_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text;
BEGIN
  v_phone := public.normalize_phone_digits(NEW.phone);
  IF v_phone IS NULL OR length(v_phone) < 8 OR NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.whatsapp_conversations
     SET customer_id = NEW.id,
         updated_at = now()
   WHERE organization_id = NEW.organization_id
     AND customer_id IS NULL
     AND public.normalize_phone_digits(phone_number) = v_phone;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_autolink_wa_conversations ON public.customers;
CREATE TRIGGER customer_autolink_wa_conversations
AFTER INSERT OR UPDATE OF phone, organization_id
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.trg_customer_autolink_wa_conversations();

-- 4) Backfill: link existing orphan conversations to matching customers now
UPDATE public.whatsapp_conversations wc
   SET customer_id = c.id,
       updated_at = now()
  FROM public.customers c
 WHERE wc.customer_id IS NULL
   AND wc.organization_id = c.organization_id
   AND public.normalize_phone_digits(wc.phone_number) IS NOT NULL
   AND public.normalize_phone_digits(wc.phone_number) = public.normalize_phone_digits(c.phone);
