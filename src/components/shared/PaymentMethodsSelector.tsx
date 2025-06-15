
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'نقدي', value: 'cash' },
  { id: 'bank_transfer', label: 'حوالة بنكية', value: 'bank_transfer' },
  { id: 'check', label: 'شيك', value: 'check' },
  { id: 'credit_card', label: 'بطاقة ائتمان', value: 'credit_card' },
  { id: 'installments', label: 'أقساط', value: 'installments' },
  { id: 'trade_credit', label: 'ائتمان تجاري', value: 'trade_credit' }
];

interface PaymentMethodsSelectorProps {
  selectedMethods: string[];
  onMethodsChange: (methods: string[]) => void;
  title?: string;
}

const PaymentMethodsSelector = ({ 
  selectedMethods, 
  onMethodsChange, 
  title = "وسائل الدفع المتاحة" 
}: PaymentMethodsSelectorProps) => {
  const handleMethodToggle = (methodValue: string) => {
    const updatedMethods = selectedMethods.includes(methodValue)
      ? selectedMethods.filter(method => method !== methodValue)
      : [...selectedMethods, methodValue];
    
    onMethodsChange(updatedMethods);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map((method) => (
            <div key={method.id} className="flex items-center space-x-2">
              <Checkbox
                id={method.id}
                checked={selectedMethods.includes(method.value)}
                onCheckedChange={() => handleMethodToggle(method.value)}
              />
              <Label htmlFor={method.id} className="text-sm cursor-pointer">
                {method.label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsSelector;
