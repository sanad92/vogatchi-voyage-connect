
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerAgentSectionProps {
  form: any;
  customers: any[];
  selectedCustomer: any;
  onCustomerSelect: (customerId: string) => void;
}

const CustomerAgentSection = ({ form, customers, selectedCustomer, onCustomerSelect }: CustomerAgentSectionProps) => (
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
      <Input {...form.register("booking_agent_name")} placeholder="أدخل اسم وكيل الحجز" />
      {form.formState.errors.booking_agent_name && (
        <p className="text-sm text-red-600 mt-1">{form.formState.errors.booking_agent_name.message}</p>
      )}
    </div>
  </div>
);

export default CustomerAgentSection;
