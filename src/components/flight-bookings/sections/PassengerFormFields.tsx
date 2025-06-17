
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PassengerDetail {
  name: string;
  passport_number: string;
  nationality: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  passport_expiry: string;
}

interface PassengerFormFieldsProps {
  passenger: PassengerDetail;
  index: number;
  onUpdate: (index: number, field: keyof PassengerDetail, value: string) => void;
}

const PassengerFormFields = ({ passenger, index, onUpdate }: PassengerFormFieldsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <Label>الاسم الكامل (كما في جواز السفر) *</Label>
        <Input
          value={passenger.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          placeholder="الاسم الكامل"
        />
      </div>
      
      <div>
        <Label>رقم جواز السفر *</Label>
        <Input
          value={passenger.passport_number}
          onChange={(e) => onUpdate(index, 'passport_number', e.target.value)}
          placeholder="رقم جواز السفر"
        />
      </div>
      
      <div>
        <Label>الجنسية *</Label>
        <Input
          value={passenger.nationality}
          onChange={(e) => onUpdate(index, 'nationality', e.target.value)}
          placeholder="الجنسية"
        />
      </div>
      
      <div>
        <Label>تاريخ الميلاد *</Label>
        <Input
          type="date"
          value={passenger.date_of_birth}
          onChange={(e) => onUpdate(index, 'date_of_birth', e.target.value)}
        />
      </div>
      
      <div>
        <Label>النوع *</Label>
        <Select 
          value={passenger.gender} 
          onValueChange={(value: 'male' | 'female') => onUpdate(index, 'gender', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">ذكر</SelectItem>
            <SelectItem value="female">أنثى</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>تاريخ انتهاء جواز السفر *</Label>
        <Input
          type="date"
          value={passenger.passport_expiry}
          onChange={(e) => onUpdate(index, 'passport_expiry', e.target.value)}
        />
      </div>
    </div>
  );
};

export default PassengerFormFields;
