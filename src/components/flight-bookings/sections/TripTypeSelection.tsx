
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, ArrowLeftRight, Route } from 'lucide-react';

interface TripTypeSelectionProps {
  value: 'one-way' | 'round-trip' | 'multi-city';
  onChange: (value: 'one-way' | 'round-trip' | 'multi-city') => void;
}

const TripTypeSelection = ({ value, onChange }: TripTypeSelectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          نوع الرحلة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
            <RadioGroupItem value="one-way" id="one-way" />
            <Label htmlFor="one-way" className="flex items-center gap-3 cursor-pointer flex-1">
              <Plane className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">ذهاب فقط</div>
                <div className="text-sm text-gray-500">رحلة في اتجاه واحد</div>
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
            <RadioGroupItem value="round-trip" id="round-trip" />
            <Label htmlFor="round-trip" className="flex items-center gap-3 cursor-pointer flex-1">
              <ArrowLeftRight className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">ذهاب وعودة</div>
                <div className="text-sm text-gray-500">رحلة ذهاب وإياب</div>
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
            <RadioGroupItem value="multi-city" id="multi-city" />
            <Label htmlFor="multi-city" className="flex items-center gap-3 cursor-pointer flex-1">
              <Route className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium">رحلة متعددة المحطات</div>
                <div className="text-sm text-gray-500">عدة وجهات في رحلة واحدة</div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default TripTypeSelection;
