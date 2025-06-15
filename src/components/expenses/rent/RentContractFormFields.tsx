
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import CurrencySelector from '@/components/currency/CurrencySelector';
import type { RentContractFormData } from './useRentContractForm';
import type { SupportedCurrency } from '@/types/currency';

interface RentContractFormFieldsProps {
  contractData: RentContractFormData;
  onUpdateField: (field: keyof RentContractFormData, value: any) => void;
}

const RentContractFormFields = ({ contractData, onUpdateField }: RentContractFormFieldsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>رقم العقد</Label>
        <Input
          value={contractData.contract_number}
          onChange={(e) => onUpdateField('contract_number', e.target.value)}
          placeholder="رقم العقد"
        />
      </div>
      <div className="space-y-2">
        <Label>نوع العقار</Label>
        <Select value={contractData.property_type} onValueChange={(value) => onUpdateField('property_type', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="office">مكتب</SelectItem>
            <SelectItem value="warehouse">مستودع</SelectItem>
            <SelectItem value="shop">محل تجاري</SelectItem>
            <SelectItem value="apartment">شقة</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 space-y-2">
        <Label>عنوان العقار</Label>
        <Input
          value={contractData.property_address}
          onChange={(e) => onUpdateField('property_address', e.target.value)}
          placeholder="العنوان الكامل للعقار"
        />
      </div>
      <div className="space-y-2">
        <Label>اسم المالك</Label>
        <Input
          value={contractData.landlord_name}
          onChange={(e) => onUpdateField('landlord_name', e.target.value)}
          placeholder="اسم مالك العقار"
        />
      </div>
      <div className="space-y-2">
        <Label>هاتف المالك</Label>
        <Input
          value={contractData.landlord_phone}
          onChange={(e) => onUpdateField('landlord_phone', e.target.value)}
          placeholder="رقم هاتف المالك"
        />
      </div>
      <div className="space-y-2">
        <Label>الإيجار الشهري</Label>
        <Input
          type="number"
          value={contractData.monthly_rent}
          onChange={(e) => onUpdateField('monthly_rent', Number(e.target.value))}
          min="0"
          step="0.01"
        />
      </div>
      <div className="space-y-2">
        <Label>العملة</Label>
        <CurrencySelector
          value={contractData.currency as SupportedCurrency}
          onValueChange={(currency) => onUpdateField('currency', currency)}
        />
      </div>
      <div className="space-y-2">
        <Label>تاريخ بداية العقد</Label>
        <Input
          type="date"
          value={contractData.start_date}
          onChange={(e) => onUpdateField('start_date', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>تاريخ انتهاء العقد</Label>
        <Input
          type="date"
          value={contractData.end_date}
          onChange={(e) => onUpdateField('end_date', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>مدة التجديد (بالأشهر)</Label>
        <Input
          type="number"
          value={contractData.renewal_period_months}
          onChange={(e) => onUpdateField('renewal_period_months', Number(e.target.value))}
          min="1"
        />
      </div>
      <div className="space-y-2">
        <Label>نسبة الزيادة السنوية (%)</Label>
        <Input
          type="number"
          value={contractData.annual_increase_percentage}
          onChange={(e) => onUpdateField('annual_increase_percentage', Number(e.target.value))}
          min="0"
          step="0.1"
        />
      </div>
      <div className="space-y-2">
        <Label>مبلغ التأمين</Label>
        <Input
          type="number"
          value={contractData.security_deposit}
          onChange={(e) => onUpdateField('security_deposit', Number(e.target.value))}
          min="0"
          step="0.01"
        />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>شروط العقد</Label>
        <Textarea
          value={contractData.contract_terms}
          onChange={(e) => onUpdateField('contract_terms', e.target.value)}
          placeholder="الشروط والأحكام الخاصة بالعقد"
          rows={4}
        />
      </div>
    </div>
  );
};

export default RentContractFormFields;
