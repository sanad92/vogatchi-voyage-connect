
import CustomerSelection from '@/components/shared/CustomerSelection';
import SupplierSelection from '@/components/shared/SupplierSelection';
import CurrentEmployeeDisplay from '@/components/shared/CurrentEmployeeDisplay';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { useCurrentEmployeeEnhanced } from '@/hooks/useCurrentEmployeeEnhanced';
import { useEffect } from 'react';
import { Customer } from '@/types/customer';

interface TransportCustomerAgentSectionProps {
  customerId: string;
  customerName: string;
  supplierId?: string;
  supplierName: string;
  bookingAgentId: string;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  onCustomerNameChange: (name: string) => void;
  onSupplierSelect: (id: string, name: string) => void;
  onSupplierNameChange: (name: string) => void;
  onBookingAgentChange: (agentId: string) => void;
  employees?: Array<{ id: string; full_name: string; employee_code: string }>;
  errors?: Record<string, string>;
  register: any;
  setValue: any;
}

const TransportCustomerAgentSection = ({
  customerId,
  customerName,
  supplierId,
  supplierName,
  bookingAgentId,
  selectedCustomer,
  onCustomerSelect,
  onCustomerNameChange,
  onSupplierSelect,
  onSupplierNameChange,
  onBookingAgentChange,
  employees = [],
  errors = {},
  register,
  setValue
}: TransportCustomerAgentSectionProps) => {
  const { currentEmployee, getBookingAgentId, getBookingAgentName } = useCurrentEmployeeEnhanced();

  // تعيين الموظف الحالي تلقائياً
  useEffect(() => {
    if (currentEmployee) {
      const agentId = getBookingAgentId();
      const agentName = getBookingAgentName();
      
      if (agentId) {
        onBookingAgentChange(agentId);
      }
      setValue('booking_agent_name', agentName);
    }
  }, [currentEmployee, getBookingAgentId, getBookingAgentName, onBookingAgentChange, setValue]);

  // Convert simple errors to the expected format
  const fieldErrors = Object.keys(errors).reduce((acc, key) => {
    acc[key] = { message: errors[key] };
    return acc;
  }, {} as any);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="h-5 w-5" />
        معلومات العميل والموظف والمورد
      </h3>
      
      {/* عرض معلومات الموظف الحالي */}
      <CurrentEmployeeDisplay employee={currentEmployee} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <CustomerSelection
            selectedCustomer={selectedCustomer}
            onCustomerSelect={onCustomerSelect}
            register={register}
            setValue={setValue}
            errors={fieldErrors}
          />
          {errors.customer_name && (
            <p className="text-sm text-red-600 mt-1">{errors.customer_name}</p>
          )}
        </div>
        
        <div>
          <SupplierSelection
            selectedSupplierId={supplierId}
            selectedSupplierName={supplierName}
            onSupplierSelect={onSupplierSelect}
            label="مورد النقل"
            supplierType="transport"
            required
          />
          {errors.supplier_name && (
            <p className="text-sm text-red-600 mt-1">{errors.supplier_name}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="booking_agent">الموظف المسؤول</Label>
          {currentEmployee?.isRealEmployee ? (
            <div className="mt-2">
              <div className="p-2 bg-gray-100 rounded border text-sm">
                {getBookingAgentName()}
              </div>
              <p className="text-xs text-gray-500 mt-1">تم تعيين الموظف تلقائياً</p>
            </div>
          ) : (
            <Select value={bookingAgentId || undefined} onValueChange={onBookingAgentChange}>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default TransportCustomerAgentSection;
