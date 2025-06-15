
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, CreditCard, Shield, Navigation, Users, Fuel } from 'lucide-react';

interface AdditionalInfoSectionProps {
  formData: {
    booking_agent_id: string;
    driver_license_number: string;
    driver_license_expiry: string;
    insurance_included: boolean;
    gps_included: boolean;
    additional_driver_count: string;
    pickup_notes: string;
    return_notes: string;
    damage_notes: string;
    special_requirements: string;
  };
  employees: Array<{ id: string; full_name: string; employee_code: string }>;
  employeesLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: any) => void;
}

const AdditionalInfoSection = ({
  formData,
  employees,
  employeesLoading,
  onInputChange,
  onSelectChange
}: AdditionalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="h-5 w-5" />
        معلومات إضافية
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="booking_agent_id">الموظف المسؤول</Label>
          <Select 
            value={formData.booking_agent_id} 
            onValueChange={(value) => onSelectChange('booking_agent_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر موظف" />
            </SelectTrigger>
            <SelectContent>
              {!employeesLoading && employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name} - {employee.employee_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="driver_license_number" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            رقم رخصة السائق
          </Label>
          <Input
            type="text"
            id="driver_license_number"
            name="driver_license_number"
            value={formData.driver_license_number}
            onChange={onInputChange}
            placeholder="رقم رخصة القيادة"
          />
        </div>

        <div>
          <Label htmlFor="driver_license_expiry">تاريخ انتهاء الرخصة</Label>
          <Input
            type="date"
            id="driver_license_expiry"
            name="driver_license_expiry"
            value={formData.driver_license_expiry}
            onChange={onInputChange}
          />
        </div>

        <div>
          <Label htmlFor="additional_driver_count" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            عدد السائقين الإضافيين
          </Label>
          <Input
            type="number"
            id="additional_driver_count"
            name="additional_driver_count"
            value={formData.additional_driver_count}
            onChange={onInputChange}
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="insurance_included"
              checked={formData.insurance_included}
              onCheckedChange={(checked) => onSelectChange('insurance_included', checked)}
            />
            <Label htmlFor="insurance_included" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              التأمين مشمول
            </Label>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="gps_included"
              checked={formData.gps_included}
              onCheckedChange={(checked) => onSelectChange('gps_included', checked)}
            />
            <Label htmlFor="gps_included" className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              نظام GPS مشمول
            </Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pickup_notes">ملاحظات الاستلام</Label>
          <Textarea
            id="pickup_notes"
            name="pickup_notes"
            value={formData.pickup_notes}
            onChange={onInputChange}
            placeholder="ملاحظات حول استلام المركبة"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="return_notes">ملاحظات التسليم</Label>
          <Textarea
            id="return_notes"
            name="return_notes"
            value={formData.return_notes}
            onChange={onInputChange}
            placeholder="ملاحظات حول تسليم المركبة"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="damage_notes">ملاحظات الأضرار</Label>
          <Textarea
            id="damage_notes"
            name="damage_notes"
            value={formData.damage_notes}
            onChange={onInputChange}
            placeholder="أي أضرار موجودة في المركبة"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="special_requirements">متطلبات خاصة</Label>
          <Textarea
            id="special_requirements"
            name="special_requirements"
            value={formData.special_requirements}
            onChange={onInputChange}
            placeholder="أي متطلبات أو طلبات خاصة"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfoSection;
