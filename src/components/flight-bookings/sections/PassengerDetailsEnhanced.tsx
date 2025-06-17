
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Users, Plus } from 'lucide-react';

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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            تفاصيل المسافرين ({passengers.length} من {numberOfPassengers})
          </div>
          <div className="flex gap-2">
            {passengers.length < numberOfPassengers && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={fillMissingPassengers}
              >
                <Plus className="h-4 w-4 mr-2" />
                إكمال البيانات المطلوبة
              </Button>
            )}
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={addPassenger}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة مسافر
            </Button>
          </div>
        </CardTitle>
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
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">المسافر {index + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removePassenger(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>الاسم الكامل (كما في جواز السفر) *</Label>
                      <Input
                        value={passenger.name}
                        onChange={(e) => updatePassenger(index, 'name', e.target.value)}
                        placeholder="الاسم الكامل"
                      />
                    </div>
                    
                    <div>
                      <Label>رقم جواز السفر *</Label>
                      <Input
                        value={passenger.passport_number}
                        onChange={(e) => updatePassenger(index, 'passport_number', e.target.value)}
                        placeholder="رقم جواز السفر"
                      />
                    </div>
                    
                    <div>
                      <Label>الجنسية *</Label>
                      <Input
                        value={passenger.nationality}
                        onChange={(e) => updatePassenger(index, 'nationality', e.target.value)}
                        placeholder="الجنسية"
                      />
                    </div>
                    
                    <div>
                      <Label>تاريخ الميلاد *</Label>
                      <Input
                        type="date"
                        value={passenger.date_of_birth}
                        onChange={(e) => updatePassenger(index, 'date_of_birth', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>النوع *</Label>
                      <Select 
                        value={passenger.gender} 
                        onValueChange={(value: 'male' | 'female') => updatePassenger(index, 'gender', value)}
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
                        onChange={(e) => updatePassenger(index, 'passport_expiry', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
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
