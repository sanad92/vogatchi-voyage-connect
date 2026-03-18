
-- Check if the columns exist and add them if they don't
DO $$
BEGIN
    -- Add utilities_included column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rent_contracts' 
                   AND column_name = 'utilities_included') THEN
        ALTER TABLE public.rent_contracts 
        ADD COLUMN utilities_included boolean DEFAULT false;
    END IF;
    
    -- Add maintenance_responsibility column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rent_contracts' 
                   AND column_name = 'maintenance_responsibility') THEN
        ALTER TABLE public.rent_contracts 
        ADD COLUMN maintenance_responsibility text DEFAULT 'tenant';
    END IF;
    
    -- Add annual_increase_percentage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rent_contracts' 
                   AND column_name = 'annual_increase_percentage') THEN
        ALTER TABLE public.rent_contracts 
        ADD COLUMN annual_increase_percentage numeric DEFAULT 0.00;
    END IF;
END $$;
