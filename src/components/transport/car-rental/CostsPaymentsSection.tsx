
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CostsPaymentsSectionProps {
  formData: {
    daily_rate: string;
    total_rental_cost: string;
    supplier_daily_cost: string;
    supplier_total_cost: string;
    insurance_cost: string;
    additional_fees: string;
    security_deposit: string;
    paid_amount: string;
    deposit_paid: string;
    payment_method: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

const CostsPaymentsSection = ({
  formData,
  onInputChange,
  onSelectChange
}: CostsPaymentsSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="daily_rate">السعر اليومي</Label>
        <Input
          type="number"
          id="daily_rate"
          name="daily_rate"
          value={formData.daily_rate}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="total_rental_cost">إجمالي تكلفة الإيجار</Label>
        <Input
          type="number"
          id="total_rental_cost"
          name="total_rental_cost"
          value={formData.total_rental_cost}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="supplier_daily_cost">تكلفة المورد اليومية</Label>
        <Input
          type="number"
          id="supplier_daily_cost"
          name="supplier_daily_cost"
          value={formData.supplier_daily_cost}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="supplier_total_cost">إجمالي تكلفة المورد</Label>
        <Input
          type="number"
          id="supplier_total_cost"
          name="supplier_total_cost"
          value={formData.supplier_total_cost}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="insurance_cost">تكلفة التأمين</Label>
        <Input
          type="number"
          id="insurance_cost"
          name="insurance_cost"
          value={formData.insurance_cost}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="additional_fees">رسوم إضافية</Label>
        <Input
          type="number"
          id="additional_fees"
          name="additional_fees"
          value={formData.additional_fees}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="security_deposit">مبلغ التأمين</Label>
        <Input
          type="number"
          id="security_deposit"
          name="security_deposit"
          value={formData.security_deposit}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="paid_amount">المبلغ المدفوع</Label>
        <Input
          type="number"
          id="paid_amount"
          name="paid_amount"
          value={formData.paid_amount}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="deposit_paid">التأمين المدفوع</Label>
        <Input
          type="number"
          id="deposit_paid"
          name="deposit_paid"
          value={formData.deposit_paid}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="payment_method">طريقة الدفع</Label>
        <Select
          value={formData.payment_method}
          onValueChange={(value) => onSelectChange('payment_method', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر طريقة الدفع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">نقداً</SelectItem>
            <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
            <SelectItem value="credit_card">بطاقة ائتمانية</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CostsPaymentsSection;
