
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CurrentEmployeeDisplay from '@/components/shared/CurrentEmployeeDisplay';
import { useCurrentEmployeeEnhanced } from '@/hooks/useCurrentEmployeeEnhanced';
import { useEffect } from 'react';

interface CustomerSupplierSectionProps {
  formData: {
    customer_name: string;
    supplier_id: string;
    booking_agent_name: string;
  };
  suppliers: any[];
  suppliersLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

const CustomerSupplierSection = ({
  formData,
  suppliers,
  suppliersLoading,
  onInputChange,
  onSelectChange
}: CustomerSupplierSectionProps) => {
  const { currentEmployee, getBookingAgentName } = useCurrentEmployeeEnhanced();

  // تعيين اسم الموظف تلقائياً
  useEffect(() => {
    if (currentEmployee && getBookingAgentName()) {
      onSelectChange('booking_agent_name', getBookingAgentName());
    }
  }, [currentEmployee, getBookingAgentName, onSelectChange]);

  // Force value to undefined if not set
  const supplierValue =
    formData.supplier_id &&
    formData.supplier_id !== "" &&
    formData.supplier_id !== "none"
      ? formData.supplier_id
      : undefined;

  return (
    <div className="space-y-4">
      {/* عرض معلومات الموظف الحالي */}
      <CurrentEmployeeDisplay employee={currentEmployee} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="customer_name">اسم العميل</Label>
          <Input
            type="text"
            id="customer_name"
            name="customer_name"
            value={formData.customer_name}
            onChange={onInputChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="supplier_id">المورد</Label>
          <Select
            value={supplierValue}
            onValueChange={(value) => onSelectChange('supplier_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر مورد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون مورد</SelectItem>
              {!suppliersLoading && suppliers?.filter(supplier => supplier.id && supplier.id !== "").map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="booking_agent_name">وكيل الحجز</Label>
          <Input
            type="text"
            id="booking_agent_name"
            name="booking_agent_name"
            value={formData.booking_agent_name || getBookingAgentName()}
            readOnly
            disabled
            className="bg-gray-100 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">يتم تعيين الموظف تلقائياً</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupplierSection;
