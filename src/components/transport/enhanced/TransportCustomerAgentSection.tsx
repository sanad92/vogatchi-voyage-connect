
import CustomerSelection from '@/components/shared/CustomerSelection';
import SupplierSelection from '@/components/shared/SupplierSelection';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';

interface TransportCustomerAgentSectionProps {
  customerId: string;
  customerName: string;
  supplierName: string;
  bookingAgentId: string;
  onCustomerSelect: (id: string, name: string) => void;
  onCustomerNameChange: (name: string) => void;
  onSupplierNameChange: (name: string) => void;
  onBookingAgentChange: (agentId: string) => void;
  employees?: Array<{ id: string; full_name: string; employee_code: string }>;
  errors?: Record<string, string>;
}

const TransportCustomerAgentSection = ({
  customerId,
  customerName,
  supplierName,
  bookingAgentId,
  onCustomerSelect,
  onCustomerNameChange,
  onSupplierNameChange,
  onBookingAgentChange,
  employees = [],
  errors = {}
}: TransportCustomerAgentSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="h-5 w-5" />
        معلومات العميل والموظف والمورد
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <CustomerSelection
            selectedCustomerId={customerId}
            selectedCustomerName={customerName}
            onCustomerSelect={onCustomerSelect}
            onCustomerNameChange={onCustomerNameChange}
            required
          />
          {errors.customer_name && (
            <p className="text-sm text-red-600 mt-1">{errors.customer_name}</p>
          )}
        </div>
        
        <div>
          <SupplierSelection
            selectedSupplierId=""
            selectedSupplierName={supplierName}
            onSupplierSelect={(id, name) => onSupplierNameChange(name)}
            onSupplierNameChange={onSupplierNameChange}
            label="مورد النقل"
            required
          />
          {errors.supplier_name && (
            <p className="text-sm text-red-600 mt-1">{errors.supplier_name}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="booking_agent">الموظف المسؤول</Label>
          <Select value={bookingAgentId} onValueChange={onBookingAgentChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر موظف" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name} - {employee.employee_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default TransportCustomerAgentSection;
