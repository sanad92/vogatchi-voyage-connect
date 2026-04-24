
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AirportSelectionField from './AirportSelectionField';
import AirlineSelectionField from './AirlineSelectionField';

interface FlightDataSelectionSectionProps {
  departureAirportId: string;
  arrivalAirportId: string;
  airlineId: string;
  onDepartureAirportChange: (id: string) => void;
  onArrivalAirportChange: (id: string) => void;
  onAirlineChange: (id: string) => void;
}

const FlightDataSelectionSection = ({
  departureAirportId,
  arrivalAirportId,
  airlineId,
  onDepartureAirportChange,
  onArrivalAirportChange,
  onAirlineChange
}: FlightDataSelectionSectionProps) => {
  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .range(0, 19999); // override default 1000 row limit
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: airlines = [] } = useQuery({
    queryKey: ['airlines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .range(0, 9999);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AirportSelectionField
        label="مطار المغادرة"
        value={departureAirportId}
        onChange={onDepartureAirportChange}
        airports={airports}
        showAddButton={true}
      />

      <AirportSelectionField
        label="مطار الوصول"
        value={arrivalAirportId}
        onChange={onArrivalAirportChange}
        airports={airports}
        showAddButton={true}
      />

      <AirlineSelectionField
        value={airlineId}
        onChange={onAirlineChange}
        airlines={airlines}
      />
    </div>
  );
};

export default FlightDataSelectionSection;
