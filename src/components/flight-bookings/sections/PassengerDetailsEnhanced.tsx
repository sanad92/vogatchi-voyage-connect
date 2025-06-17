
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Users } from 'lucide-react';
import PassengerCard from './PassengerCard';
import PassengerListHeader from './PassengerListHeader';

interface PassengerDetail {
  name: string;
  passport_number: string;
  nationality: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  passport_expiry: string;
}

interface PassengerDetailsEnhancedProps {
  passengers: PassengerDetail[];
  numberOfPassengers: number;
  onChange: (passengers: PassengerDetail[]) => void;
}

const PassengerDetailsEnhanced = ({ 
  passengers, 
  numberOfPassengers, 
  onChange 
}: PassengerDetailsEnhancedProps) => {
  
  const addPassenger = () => {
    const newPassenger: PassengerDetail = {
      name: '',
      passport_number: '',
      nationality: '',
      date_of_birth: '',
      gender: 'male',
      passport_expiry: ''
    };
    onChange([...passengers, newPassenger]);
  };

  const removePassenger = (index: number) => {
    const updatedPassengers = passengers.filter((_, i) => i !== index);
    onChange(updatedPassengers);
  };

  const updatePassenger = (index: number, field: keyof PassengerDetail, value: string) => {
    const updatedPassengers = passengers.map((passenger, i) => 
      i === index ? { ...passenger, [field]: value } : passenger
    );
    onChange(updatedPassengers);
  };

  const fillMissingPassengers = () => {
    const missingCount = numberOfPassengers - passengers.length;
    if (missingCount > 0) {
      const newPassengers = Array(missingCount).fill(null).map(() => ({
        name: '',
        passport_number: '',
        nationality: '',
        date_of_birth: '',
        gender: 'male' as const,
        passport_expiry: ''
      }));
      onChange([...passengers, ...newPassengers]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <PassengerListHeader
          passengersCount={passengers.length}
          numberOfPassengers={numberOfPassengers}
          onAddPassenger={addPassenger}
          onFillMissingPassengers={fillMissingPassengers}
        />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {passengers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لم يتم إضافة تفاصيل المسافرين بعد</p>
            <p className="text-sm">انقر على "إضافة مسافر" لبدء إدخال البيانات</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {passengers.map((passenger, index) => (
              <PassengerCard
                key={index}
                passenger={passenger}
                index={index}
                onUpdate={updatePassenger}
                onRemove={removePassenger}
              />
            ))}
          </div>
        )}
        
        {passengers.length > 0 && passengers.length !== numberOfPassengers && (
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800">
              تم إدخال بيانات {passengers.length} مسافر من أصل {numberOfPassengers} مطلوب
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PassengerDetailsEnhanced;
