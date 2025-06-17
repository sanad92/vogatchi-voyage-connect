
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CurrentEmployeeDisplay from "@/components/shared/CurrentEmployeeDisplay";
import { useCurrentEmployeeEnhanced } from "@/hooks/useCurrentEmployeeEnhanced";

interface CustomerAgentSectionProps {
  form: any;
  customers: any[];
  selectedCustomer: any;
  onCustomerSelect: (customerId: string) => void;
}

const CustomerAgentSection = ({ form, customers, selectedCustomer, onCustomerSelect }: CustomerAgentSectionProps) => {
  const { currentEmployee, getBookingAgentName } = useCurrentEmployeeEnhanced();

  // تعيين اسم الموظف تلقائياً
  React.useEffect(() => {
    if (currentEmployee) {
      form.setValue('booking_agent_name', getBookingAgentName());
    }
  }, [currentEmployee, form, getBookingAgentName]);

  return (
    <div className="space-y-4">
      {/* عرض معلومات الموظف الحالي */}
      <CurrentEmployeeDisplay employee={currentEmployee} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer_select">اختيار عميل موجود (اختياري)</Label>
          <Select onValueChange={onCustomerSelect}>
            <SelectTrigger>
              <SelectValue placeholder="اختر عميل..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>اسم العميل</Label>
          <Input {...form.register("customer_name")} placeholder="أدخل اسم العميل" />
          {form.formState.errors.customer_name && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.customer_name.message}</p>
          )}
        </div>
        <div>
          <Label>وكيل الحجز</Label>
          <Input 
            {...form.register("booking_agent_name")} 
            placeholder="اسم وكيل الحجز"
            readOnly
            disabled
            className="bg-gray-100 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">يتم تعيين الموظف تلقائياً بناءً على المستخدم المسجل دخوله</p>
          {form.formState.errors.booking_agent_name && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.booking_agent_name.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerAgentSection;
