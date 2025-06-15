
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

interface FlightFinancialInfoSectionProps {
  form: any;
}

const FlightFinancialInfoSection = ({ form }: FlightFinancialInfoSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <FormField
      control={form.control}
      name="ticket_price_per_person"
      render={({ field }) => (
        <FormItem>
          <FormLabel>سعر التذكرة للشخص الواحد</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              step="0.01"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="taxes_and_fees"
      render={({ field }) => (
        <FormItem>
          <FormLabel>الضرائب والرسوم</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              step="0.01"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="currency"
      render={({ field }) => (
        <FormItem>
          <FormLabel>العملة</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="اختر العملة" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="EGP">جنيه مصري (ج.م)</SelectItem>
              <SelectItem value="USD">دولار أمريكي ($)</SelectItem>
              <SelectItem value="SAR">ريال سعودي (ر.س)</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="supplier_cost"
      render={({ field }) => (
        <FormItem>
          <FormLabel>تكلفة المورد</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              step="0.01"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="supplier_name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>اسم المورد</FormLabel>
          <FormControl>
            <Input {...field} placeholder="اسم شركة الطيران أو الوكيل" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="paid_amount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>المبلغ المدفوع</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              step="0.01"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="payment_method"
      render={({ field }) => (
        <FormItem>
          <FormLabel>طريقة الدفع</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="اختر طريقة الدفع" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="cash">نقدي</SelectItem>
              <SelectItem value="card">بطاقة ائتمان</SelectItem>
              <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              <SelectItem value="installment">تقسيط</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

export default FlightFinancialInfoSection;
