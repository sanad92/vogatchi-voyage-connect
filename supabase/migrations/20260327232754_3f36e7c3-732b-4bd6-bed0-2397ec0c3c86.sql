
-- Unified Booking System - Schema Only

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  booking_number text NOT NULL,
  booking_type text NOT NULL CHECK (booking_type IN ('hotel', 'flight', 'car_rental', 'transport')),
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  employee_id uuid REFERENCES public.employees(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  supplier_name text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  status_id uuid REFERENCES public.booking_statuses(id),
  selling_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  currency text DEFAULT 'EGP',
  start_date date,
  end_date date,
  notes text,
  quote_id uuid REFERENCES public.quotes(id),
  legacy_table text,
  legacy_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.booking_hotel_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  hotel_name text, room_type text, board_type text,
  check_in date, check_out date, nights integer, rooms integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.booking_flight_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  airline text, flight_number text, departure_airport text, arrival_airport text,
  departure_date date, departure_time text, arrival_date date, arrival_time text,
  ticket_number text, pnr text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.booking_car_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  car_type text, pickup_location text, dropoff_location text,
  pickup_date date, dropoff_date date, daily_rate numeric DEFAULT 0,
  insurance_included boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.booking_transport_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  vehicle_type text, route text, pickup_point text, dropoff_point text,
  passengers integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bookings_org ON public.bookings(organization_id);
CREATE INDEX idx_bookings_type ON public.bookings(booking_type);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_employee ON public.bookings(employee_id);
CREATE INDEX idx_bookings_dates ON public.bookings(start_date, end_date);
CREATE INDEX idx_bookings_legacy ON public.bookings(legacy_table, legacy_id);
CREATE INDEX idx_booking_hotel_booking ON public.booking_hotel_details(booking_id);
CREATE INDEX idx_booking_flight_booking ON public.booking_flight_details(booking_id);
CREATE INDEX idx_booking_car_booking ON public.booking_car_details(booking_id);
CREATE INDEX idx_booking_transport_booking ON public.booking_transport_details(booking_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_hotel_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_flight_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_car_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_transport_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select" ON public.bookings FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())));
CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())));
CREATE POLICY "bookings_delete" ON public.bookings FOR DELETE TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())));

CREATE POLICY "hotel_details_select" ON public.booking_hotel_details FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.organization_id = ANY(public.get_user_org_ids(auth.uid()))));
CREATE POLICY "hotel_details_insert" ON public.booking_hotel_details FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.organization_id = ANY(public.get_user_org_ids(auth.uid()))));
CREATE POLICY "flight_details_select" ON public.booking_flight_details FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.organization_id = ANY(public.get_user_org_ids(auth.uid()))));
CREATE POLICY "flight_details_insert" ON public.booking_flight_details FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.organization_id = ANY(public.get_user_org_ids(auth.uid()))));
CREATE POLICY "car_details_select" ON public.booking_car_details FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.organization_id = ANY(public.get_user_org_ids(auth.uid()))));
CREATE POLICY "car_details_insert" ON public.booking_car_details FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.organization_id = ANY(public.get_user_org_ids(auth.uid()))));
CREATE POLICY "transport_details_select" ON public.booking_transport_details FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.organization_id = ANY(public.get_user_org_ids(auth.uid()))));
CREATE POLICY "transport_details_insert" ON public.booking_transport_details FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.organization_id = ANY(public.get_user_org_ids(auth.uid()))));

CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE OR REPLACE FUNCTION public.generate_booking_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_number TEXT; counter INT;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.bookings;
  new_number := 'BK-' || to_char(now(), 'YYYY') || '-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_number;
END; $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
