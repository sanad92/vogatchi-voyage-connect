
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
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: airlines = [] } = useQuery({
    queryKey: ['airlines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    }
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
        showAddButton={false}
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
