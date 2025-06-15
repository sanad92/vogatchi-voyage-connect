
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VehicleDetailsSectionProps {
  formData: {
    vehicle_type_id: string;
  };
  vehicleTypes: any[];
  vehicleTypesLoading: boolean;
  onSelectChange: (name: string, value: string) => void;
}

const VehicleDetailsSection = ({
  formData,
  vehicleTypes,
  vehicleTypesLoading,
  onSelectChange
}: VehicleDetailsSectionProps) => {
  // Force value to undefined if not set
  const value =
    formData.vehicle_type_id &&
    formData.vehicle_type_id !== "" &&
    formData.vehicle_type_id !== "none"
      ? formData.vehicle_type_id
      : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="vehicle_type_id">نوع السيارة</Label>
        <Select
          value={value}
          onValueChange={(value) => onSelectChange('vehicle_type_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر نوع السيارة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون نوع</SelectItem>
            {!vehicleTypesLoading && vehicleTypes?.filter(type => type.id && type.id !== "").map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default VehicleDetailsSection;
