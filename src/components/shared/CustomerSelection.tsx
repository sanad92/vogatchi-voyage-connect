
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useState } from 'react';

interface CustomerSelectionProps {
  selectedCustomerId?: string;
  selectedCustomerName?: string;
  onCustomerSelect: (customerId: string, customerName: string) => void;
  onCustomerNameChange?: (name: string) => void;
  allowNewCustomer?: boolean;
  required?: boolean;
}

const CustomerSelection = ({
  selectedCustomerId,
  selectedCustomerName,
  onCustomerSelect,
  onCustomerNameChange,
  allowNewCustomer = true,
  required = true
}: CustomerSelectionProps) => {
  const { customers, isLoading } = useCustomers();
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      onCustomerSelect(customerId, customer.name);
    }
  };

  if (showNewCustomer) {
    return (
      <div className="space-y-2">
        <Label htmlFor="customer_name">اسم العميل الجديد</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            id="customer_name"
            value={selectedCustomerName || ''}
            onChange={(e) => onCustomerNameChange?.(e.target.value)}
            placeholder="أدخل اسم العميل"
            required={required}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowNewCustomer(false)}
          >
            إلغاء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="customer_id">العميل</Label>
      <div className="flex gap-2">
        <Select
          value={selectedCustomerId || ''}
          onValueChange={handleCustomerChange}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="اختر عميل موجود" />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="" disabled>جاري التحميل...</SelectItem>
            ) : (
              customers?.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{customer.name}</span>
                    {customer.phone && (
                      <span className="text-xs text-gray-500">({customer.phone})</span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {allowNewCustomer && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowNewCustomer(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            جديد
          </Button>
        )}
      </div>
    </div>
  );
};

export default CustomerSelection;
