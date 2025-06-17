
import React from 'react';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Users, Plus } from 'lucide-react';

interface PassengerListHeaderProps {
  passengersCount: number;
  numberOfPassengers: number;
  onAddPassenger: () => void;
  onFillMissingPassengers: () => void;
}

const PassengerListHeader = ({ 
  passengersCount, 
  numberOfPassengers, 
  onAddPassenger, 
  onFillMissingPassengers 
}: PassengerListHeaderProps) => {
  return (
    <CardTitle className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        تفاصيل المسافرين ({passengersCount} من {numberOfPassengers})
      </div>
      <div className="flex gap-2">
        {passengersCount < numberOfPassengers && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={onFillMissingPassengers}
          >
            <Plus className="h-4 w-4 mr-2" />
            إكمال البيانات المطلوبة
          </Button>
        )}
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={onAddPassenger}
        >
          <Plus className="h-4 w-4 mr-2" />
          إضافة مسافر
        </Button>
      </div>
    </CardTitle>
  );
};

export default PassengerListHeader;
