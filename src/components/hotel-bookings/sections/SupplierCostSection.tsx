
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewHotelBooking, HotelSupplier } from "@/types/hotelBooking";

interface SupplierCostSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
  suppliers: HotelSupplier[];
  totalCostCustomer: number;
  totalProfit: number;
}

const SupplierCostSection = ({ 
  register, 
  setValue, 
  errors, 
  suppliers, 
  totalCostCustomer, 
  totalProfit 
}: SupplierCostSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>المورد والتكلفة</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supplier_name">اسم المورد *</Label>
          <Select onValueChange={(value) => setValue('supplier_name', value)}>
            <SelectTrigger>
              <SelectValue placeholder="اختر المورد" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.name}>
                  {supplier.name} {supplier.is_direct_hotel && '(مباشر)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="cost_per_night">تكلفة الليلة (مورد) *</Label>
          <Input 
            id="cost_per_night"
            type="number"
            step="0.01"
            {...register('cost_per_night', { required: 'تكلفة الليلة مطلوبة', min: 0 })}
          />
          {errors.cost_per_night && <p className="text-red-500 text-sm">{errors.cost_per_night.message}</p>}
        </div>

        <div>
          <Label htmlFor="selling_price_per_night">سعر البيع لليلة *</Label>
          <Input 
            id="selling_price_per_night"
            type="number"
            step="0.01"
            {...register('selling_price_per_night', { required: 'سعر البيع مطلوب', min: 0 })}
          />
          {errors.selling_price_per_night && <p className="text-red-500 text-sm">{errors.selling_price_per_night.message}</p>}
        </div>

        <div>
          <Label>إجمالي التكلفة للعميل</Label>
          <Input value={totalCostCustomer.toFixed(2)} disabled />
        </div>

        <div>
          <Label>إجمالي الربح</Label>
          <Input value={totalProfit.toFixed(2)} disabled />
        </div>

        <div>
          <Label htmlFor="payment_method">طريقة الدفع</Label>
          <Input 
            id="payment_method"
            {...register('payment_method')}
          />
        </div>

        <div>
          <Label htmlFor="paid_amount">المبلغ المدفوع</Label>
          <Input 
            id="paid_amount"
            type="number"
            step="0.01"
            {...register('paid_amount')}
          />
        </div>

        <div>
          <Label htmlFor="payment_due_date">تاريخ استحقاق الدفع</Label>
          <Input 
            id="payment_due_date"
            type="date"
            {...register('payment_due_date')}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierCostSection;
