
-- Add employee_id to booking tables that lack it
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id);
ALTER TABLE public.flight_bookings ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id);
ALTER TABLE public.car_rentals ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id);
ALTER TABLE public.transport_bookings ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id);

-- Add additional_costs columns
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS additional_costs numeric DEFAULT 0;
ALTER TABLE public.flight_bookings ADD COLUMN IF NOT EXISTS additional_costs numeric DEFAULT 0;
ALTER TABLE public.car_rentals ADD COLUMN IF NOT EXISTS additional_costs numeric DEFAULT 0;
ALTER TABLE public.transport_bookings ADD COLUMN IF NOT EXISTS additional_costs numeric DEFAULT 0;

-- Indexes for employee_id
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_employee ON public.hotel_bookings(employee_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_employee ON public.flight_bookings(employee_id);
CREATE INDEX IF NOT EXISTS idx_car_rentals_employee ON public.car_rentals(employee_id);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_employee ON public.transport_bookings(employee_id);
