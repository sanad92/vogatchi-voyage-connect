ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS pilgrim_id uuid REFERENCES public.pilgrims(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS customer_payments_pilgrim_idx ON public.customer_payments(pilgrim_id);
ALTER TABLE public.pilgrims
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS makkah_room text,
  ADD COLUMN IF NOT EXISTS madinah_room text,
  ADD COLUMN IF NOT EXISTS bus_number text,
  ADD COLUMN IF NOT EXISTS supervisor text,
  ADD COLUMN IF NOT EXISTS portal_barcode text,
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.pilgrimage_programs ADD COLUMN IF NOT EXISTS terms text;

CREATE OR REPLACE FUNCTION public._sync_pilgrim_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ids uuid[];
BEGIN
  ids := ARRAY[]::uuid[];
  IF TG_OP <> 'DELETE' AND NEW.pilgrim_id IS NOT NULL THEN ids := ids || NEW.pilgrim_id; END IF;
  IF TG_OP <> 'INSERT' AND OLD.pilgrim_id IS NOT NULL THEN ids := ids || OLD.pilgrim_id; END IF;
  UPDATE public.pilgrims g SET paid_amount = COALESCE((
    SELECT SUM(amount) FROM public.customer_payments c
    WHERE c.pilgrim_id = g.id AND c.status = 'completed' AND c.organization_id = g.organization_id), 0)
  WHERE g.id = ANY(ids);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_sync_pilgrim_paid ON public.customer_payments;
CREATE TRIGGER trg_sync_pilgrim_paid AFTER INSERT OR UPDATE OR DELETE ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION public._sync_pilgrim_paid();