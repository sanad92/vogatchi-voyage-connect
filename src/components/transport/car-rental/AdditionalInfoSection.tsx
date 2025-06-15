
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
  employees: any[];
  employeesLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: string) => void;
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
      {/* معلومات إضافية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="booking_agent_id">وكيل الحجز</Label>
          <Select
            value={formData.booking_agent_id}
            onValueChange={(value) => onSelectChange('booking_agent_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر وكيل الحجز" />
            </SelectTrigger>
            <SelectContent>
              {!employeesLoading && employees?.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="driver_license_number">رقم رخصة القيادة</Label>
          <Input
            type="text"
            id="driver_license_number"
            name="driver_license_number"
            value={formData.driver_license_number}
            onChange={onInputChange}
          />
        </div>
        <div>
          <Label htmlFor="driver_license_expiry">تاريخ انتهاء رخصة القيادة</Label>
          <Input
            type="date"
            id="driver_license_expiry"
            name="driver_license_expiry"
            value={formData.driver_license_expiry}
            onChange={onInputChange}
          />
        </div>
      </div>

      {/* خيارات */}
      <div className="flex items-center space-x-2 gap-4">
        <div className="flex items-center space-x-2">
          <Input
            type="checkbox"
            id="insurance_included"
            name="insurance_included"
            checked={formData.insurance_included}
            onChange={onInputChange}
            className="w-4 h-4"
          />
          <Label htmlFor="insurance_included">تأمين مشمول؟</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Input
            type="checkbox"
            id="gps_included"
            name="gps_included"
            checked={formData.gps_included}
            onChange={onInputChange}
            className="w-4 h-4"
          />
          <Label htmlFor="gps_included">GPS مشمول؟</Label>
        </div>
      </div>

      {/* عدد السائقين الإضافيين */}
      <div>
        <Label htmlFor="additional_driver_count">عدد السائقين الإضافيين</Label>
        <Input
          type="number"
          id="additional_driver_count"
          name="additional_driver_count"
          value={formData.additional_driver_count}
          onChange={onInputChange}
        />
      </div>

      {/* ملاحظات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pickup_notes">ملاحظات الاستلام</Label>
          <Textarea
            id="pickup_notes"
            name="pickup_notes"
            value={formData.pickup_notes}
            onChange={onInputChange}
          />
        </div>
        <div>
          <Label htmlFor="return_notes">ملاحظات التسليم</Label>
          <Textarea
            id="return_notes"
            name="return_notes"
            value={formData.return_notes}
            onChange={onInputChange}
          />
        </div>
        <div>
          <Label htmlFor="damage_notes">ملاحظات الأضرار</Label>
          <Textarea
            id="damage_notes"
            name="damage_notes"
            value={formData.damage_notes}
            onChange={onInputChange}
          />
        </div>
        <div>
          <Label htmlFor="special_requirements">متطلبات خاصة</Label>
          <Textarea
            id="special_requirements"
            name="special_requirements"
            value={formData.special_requirements}
            onChange={onInputChange}
          />
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfoSection;
