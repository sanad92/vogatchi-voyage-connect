
-- Migration to fix existing bookings by linking booking_agent_id based on booking_agent_name
-- This will update hotel_bookings, flight_bookings, car_rentals, and transport_bookings

-- Update hotel_bookings
UPDATE public.hotel_bookings 
SET booking_agent_id = employees.id
FROM public.employees 
WHERE hotel_bookings.booking_agent_id IS NULL 
  AND hotel_bookings.booking_agent_name IS NOT NULL
  AND (
    employees.full_name = hotel_bookings.booking_agent_name 
    OR employees.employee_code = hotel_bookings.booking_agent_name
  )
  AND employees.is_active = true;

-- Update flight_bookings  
UPDATE public.flight_bookings 
SET booking_agent_id = employees.id
FROM public.employees 
WHERE flight_bookings.booking_agent_id IS NULL 
  AND flight_bookings.booking_agent_name IS NOT NULL
  AND (
    employees.full_name = flight_bookings.booking_agent_name 
    OR employees.employee_code = flight_bookings.booking_agent_name
  )
  AND employees.is_active = true;

-- Update car_rentals
UPDATE public.car_rentals 
SET booking_agent_id = employees.id
FROM public.employees 
WHERE car_rentals.booking_agent_id IS NULL 
  AND car_rentals.booking_agent_name IS NOT NULL
  AND (
    employees.full_name = car_rentals.booking_agent_name 
    OR employees.employee_code = car_rentals.booking_agent_name
  )
  AND employees.is_active = true;

-- Update transport_bookings (if exists)
UPDATE public.transport_bookings 
SET booking_agent_id = employees.id
FROM public.employees 
WHERE transport_bookings.booking_agent_id IS NULL 
  AND transport_bookings.booking_agent_name IS NOT NULL
  AND (
    employees.full_name = transport_bookings.booking_agent_name 
    OR employees.employee_code = transport_bookings.booking_agent_name
  )
  AND employees.is_active = true;

-- Create or replace function to calculate employee bookings profit with fallback support
CREATE OR REPLACE FUNCTION public.calculate_employee_bookings_profit(
  p_employee_id uuid,
  p_period_start date,
  p_period_end date
) 
RETURNS TABLE(
  booking_type text,
  booking_id uuid,
  booking_amount numeric,
  supplier_cost numeric,
  profit numeric,
  booking_date date
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_name text;
  employee_code text;
BEGIN
  -- Get employee details for fallback
  SELECT full_name, employee_code INTO employee_name, employee_code
  FROM public.employees 
  WHERE id = p_employee_id;
  
  -- Return bookings from all tables with both booking_agent_id and booking_agent_name matching
  RETURN QUERY
  -- Hotel bookings
  SELECT 
    'hotel'::text as booking_type,
    hb.id as booking_id,
    COALESCE(hb.total_cost_customer, 0)::numeric as booking_amount,
    COALESCE(hb.cost_per_night * hb.number_of_nights, 0)::numeric as supplier_cost,
    COALESCE(hb.total_profit, 0)::numeric as profit,
    hb.booking_date::date as booking_date
  FROM public.hotel_bookings hb
  WHERE hb.booking_date BETWEEN p_period_start AND p_period_end
    AND (
      hb.booking_agent_id = p_employee_id 
      OR hb.booking_agent_name = employee_name 
      OR hb.booking_agent_name = employee_code
    )
  
  UNION ALL
  
  -- Flight bookings
  SELECT 
    'flight'::text as booking_type,
    fb.id as booking_id,
    COALESCE(fb.total_cost, 0)::numeric as booking_amount,
    COALESCE(fb.supplier_cost, 0)::numeric as supplier_cost,
    COALESCE(fb.total_profit, 0)::numeric as profit,
    fb.booking_date::date as booking_date
  FROM public.flight_bookings fb
  WHERE fb.booking_date BETWEEN p_period_start AND p_period_end
    AND (
      fb.booking_agent_id = p_employee_id 
      OR fb.booking_agent_name = employee_name 
      OR fb.booking_agent_name = employee_code
    )
  
  UNION ALL
  
  -- Car rentals
  SELECT 
    'car_rental'::text as booking_type,
    cr.id as booking_id,
    COALESCE(cr.total_rental_cost, 0)::numeric as booking_amount,
    COALESCE(cr.supplier_total_cost, 0)::numeric as supplier_cost,
    COALESCE(cr.total_profit, 0)::numeric as profit,
    cr.rental_start_date::date as booking_date
  FROM public.car_rentals cr
  WHERE cr.rental_start_date BETWEEN p_period_start AND p_period_end
    AND (
      cr.booking_agent_id = p_employee_id 
      OR cr.booking_agent_name = employee_name 
      OR cr.booking_agent_name = employee_code
    )
  
  ORDER BY booking_date DESC;
END;
$$;
