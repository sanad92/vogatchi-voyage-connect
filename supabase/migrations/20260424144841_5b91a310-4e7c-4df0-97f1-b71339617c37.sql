
-- ============================================
-- المرحلة 3: نظام الموردين المتقدم
-- ============================================

-- 1) إضافة organization_id لـ supplier_contracts إن لم يوجد
ALTER TABLE public.supplier_contracts 
  ADD COLUMN IF NOT EXISTS organization_id uuid;

UPDATE public.supplier_contracts sc
SET organization_id = s.organization_id
FROM public.suppliers s
WHERE sc.supplier_id = s.id AND sc.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_contracts_org ON public.supplier_contracts(organization_id);

-- ============================================
-- 2) جدول الأسعار الموسمية (supplier_rates)
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.supplier_contracts(id) ON DELETE SET NULL,
  service_type text NOT NULL CHECK (service_type IN ('hotel','flight','transport','car_rental','tour','other')),
  service_reference text, -- مثل: نوع الغرفة / فئة الطيارة / نوع السيارة
  season_name text,        -- High / Low / Shoulder / Ramadan / etc
  start_date date NOT NULL,
  end_date date NOT NULL,
  cost_price numeric NOT NULL DEFAULT 0,         -- سعر الشراء من المورد
  selling_price numeric NOT NULL DEFAULT 0,      -- سعر البيع للعميل
  markup_percentage numeric DEFAULT 0,           -- نسبة الربح
  currency text NOT NULL DEFAULT 'EGP',
  min_nights integer DEFAULT 1,                  -- حد أدنى لليالي
  max_nights integer,
  is_refundable boolean DEFAULT true,
  cancellation_policy text,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_rates_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_supplier_rates_supplier ON public.supplier_rates(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rates_org ON public.supplier_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rates_dates ON public.supplier_rates(start_date, end_date);

ALTER TABLE public.supplier_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rates_select_org" ON public.supplier_rates FOR SELECT
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "rates_insert_org" ON public.supplier_rates FOR INSERT
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "rates_update_org" ON public.supplier_rates FOR UPDATE
  USING (public.can_org_write(organization_id));
CREATE POLICY "rates_delete_org" ON public.supplier_rates FOR DELETE
  USING (public.can_org_write(organization_id));

CREATE TRIGGER update_supplier_rates_updated_at BEFORE UPDATE ON public.supplier_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3) جدول Allotments (بلوكات المخزون المحجوزة)
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_allotments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.supplier_contracts(id) ON DELETE SET NULL,
  service_type text NOT NULL CHECK (service_type IN ('hotel','flight','transport','car_rental','tour','other')),
  service_reference text,         -- نوع الغرفة / المقعد / السيارة
  allotment_name text NOT NULL,   -- اسم البلوك (مثل: غرف ديلوكس - صيف 2026)
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_quantity integer NOT NULL DEFAULT 0,    -- إجمالي الوحدات المحجوزة
  used_quantity integer NOT NULL DEFAULT 0,     -- المستخدم
  release_days integer DEFAULT 7,               -- إفراج تلقائي قبل X يوم من تاريخ الخدمة
  cost_per_unit numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','released','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT allotments_dates_check CHECK (end_date >= start_date),
  CONSTRAINT allotments_qty_check CHECK (used_quantity <= total_quantity)
);

CREATE INDEX IF NOT EXISTS idx_allotments_supplier ON public.supplier_allotments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_allotments_org ON public.supplier_allotments(organization_id);
CREATE INDEX IF NOT EXISTS idx_allotments_dates ON public.supplier_allotments(start_date, end_date);

ALTER TABLE public.supplier_allotments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allotments_select_org" ON public.supplier_allotments FOR SELECT
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "allotments_insert_org" ON public.supplier_allotments FOR INSERT
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "allotments_update_org" ON public.supplier_allotments FOR UPDATE
  USING (public.can_org_write(organization_id));
CREATE POLICY "allotments_delete_org" ON public.supplier_allotments FOR DELETE
  USING (public.can_org_write(organization_id));

CREATE TRIGGER update_supplier_allotments_updated_at BEFORE UPDATE ON public.supplier_allotments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4) جدول استخدام الـ Allotments (تتبع كل حجز)
-- ============================================
CREATE TABLE IF NOT EXISTS public.allotment_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  allotment_id uuid NOT NULL REFERENCES public.supplier_allotments(id) ON DELETE CASCADE,
  booking_type text NOT NULL,
  booking_id uuid NOT NULL,
  quantity_used integer NOT NULL DEFAULT 1,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allotment_usage_allotment ON public.allotment_usage(allotment_id);
CREATE INDEX IF NOT EXISTS idx_allotment_usage_booking ON public.allotment_usage(booking_id);

ALTER TABLE public.allotment_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_org" ON public.allotment_usage FOR SELECT
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "usage_insert_org" ON public.allotment_usage FOR INSERT
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "usage_delete_org" ON public.allotment_usage FOR DELETE
  USING (public.can_org_write(organization_id));

-- ============================================
-- 5) Trigger: تحديث used_quantity تلقائياً
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_update_allotment_usage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.supplier_allotments
    SET used_quantity = used_quantity + NEW.quantity_used,
        updated_at = now()
    WHERE id = NEW.allotment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.supplier_allotments
    SET used_quantity = GREATEST(0, used_quantity - OLD.quantity_used),
        updated_at = now()
    WHERE id = OLD.allotment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_allotment_usage_change ON public.allotment_usage;
CREATE TRIGGER trg_allotment_usage_change
AFTER INSERT OR DELETE ON public.allotment_usage
FOR EACH ROW EXECUTE FUNCTION public.trg_update_allotment_usage();

-- ============================================
-- 6) RPC: البحث عن السعر المناسب لتاريخ معين
-- ============================================
CREATE OR REPLACE FUNCTION public.find_supplier_rate(
  _org_id uuid, _supplier_id uuid, _service_type text,
  _service_date date, _service_reference text DEFAULT NULL
) RETURNS TABLE (
  rate_id uuid, cost_price numeric, selling_price numeric,
  markup_percentage numeric, currency text, season_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, cost_price, selling_price, markup_percentage, currency, season_name
  FROM public.supplier_rates
  WHERE organization_id = _org_id
    AND supplier_id = _supplier_id
    AND service_type = _service_type
    AND is_active = true
    AND _service_date BETWEEN start_date AND end_date
    AND (_service_reference IS NULL OR service_reference IS NULL OR service_reference = _service_reference)
  ORDER BY 
    CASE WHEN service_reference = _service_reference THEN 0 ELSE 1 END,
    (end_date - start_date) ASC -- الأكثر تخصيصاً (نطاق أصغر) أولاً
  LIMIT 1;
$$;

-- ============================================
-- 7) RPC: ملخص أداء المورد
-- ============================================
CREATE OR REPLACE FUNCTION public.get_supplier_performance(_org_id uuid, _supplier_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_bookings integer := 0;
  v_total_cost numeric := 0;
  v_total_paid numeric := 0;
  v_outstanding numeric := 0;
  v_avg_rating numeric := 0;
  v_active_allotments integer := 0;
  v_allotment_utilization numeric := 0;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(COALESCE(cost_per_night,0)*COALESCE(number_of_nights,0)),0)
    INTO v_total_bookings, v_total_cost
  FROM public.hotel_bookings WHERE organization_id=_org_id AND supplier_id=_supplier_id;

  SELECT COALESCE(SUM(amount),0) INTO v_total_paid
  FROM public.supplier_payments WHERE supplier_id=_supplier_id;

  v_outstanding := v_total_cost - v_total_paid;

  SELECT COALESCE(AVG(rating),0) INTO v_avg_rating
  FROM public.supplier_ratings WHERE supplier_id=_supplier_id;

  SELECT COUNT(*),
    COALESCE(AVG(CASE WHEN total_quantity > 0 THEN (used_quantity::numeric/total_quantity)*100 ELSE 0 END),0)
    INTO v_active_allotments, v_allotment_utilization
  FROM public.supplier_allotments 
  WHERE organization_id=_org_id AND supplier_id=_supplier_id AND status='active';

  RETURN jsonb_build_object(
    'total_bookings', v_total_bookings,
    'total_cost', v_total_cost,
    'total_paid', v_total_paid,
    'outstanding_balance', v_outstanding,
    'average_rating', v_avg_rating,
    'active_allotments', v_active_allotments,
    'allotment_utilization_pct', v_allotment_utilization
  );
END; $$;
