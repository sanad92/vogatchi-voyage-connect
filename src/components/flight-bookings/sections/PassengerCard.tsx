
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import PassengerFormFields from './PassengerFormFields';

interface PassengerDetail {
  name: string;
  passport_number: string;
  nationality: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  passport_expiry: string;
}

interface PassengerCardProps {
  passenger: PassengerDetail;
  index: number;
  onUpdate: (index: number, field: keyof PassengerDetail, value: string) => void;
  onRemove: (index: number) => void;
}

const PassengerCard = ({ passenger, index, onUpdate, onRemove }: PassengerCardProps) => {
  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">المسافر {index + 1}</CardTitle>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <PassengerFormFields
          passenger={passenger}
          index={index}
          onUpdate={onUpdate}
        />
      </CardContent>
    </Card>
  );
};

export default PassengerCard;
