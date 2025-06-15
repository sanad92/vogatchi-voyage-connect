
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car } from 'lucide-react';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';

interface VehicleDetailsSectionProps {
  vehicleTypeId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  vehiclePlateNumber: string;
  onVehicleTypeChange: (typeId: string) => void;
  onVehicleMakeChange: (make: string) => void;
  onVehicleModelChange: (model: string) => void;
  onVehicleYearChange: (year: number) => void;
  onVehicleColorChange: (color: string) => void;
  onVehiclePlateNumberChange: (plateNumber: string) => void;
  errors?: Record<string, string>;
}

const VehicleDetailsSection = ({
  vehicleTypeId,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  vehicleColor,
  vehiclePlateNumber,
  onVehicleTypeChange,
  onVehicleMakeChange,
  onVehicleModelChange,
  onVehicleYearChange,
  onVehicleColorChange,
  onVehiclePlateNumberChange,
  errors = {}
}: VehicleDetailsSectionProps) => {
  const { vehicleTypes, vehicleTypesLoading } = useVehicleTypes();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Car className="h-5 w-5" />
        تفاصيل المركبة
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="vehicle_type_id">نوع المركبة</Label>
          <Select value={vehicleTypeId} onValueChange={onVehicleTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع المركبة" />
            </SelectTrigger>
            <SelectContent>
              {!vehicleTypesLoading && vehicleTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name_ar || type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vehicle_type_id && (
            <p className="text-sm text-red-600 mt-1">{errors.vehicle_type_id}</p>
          )}
        </div>

        <div>
          <Label htmlFor="vehicle_make">صنع المركبة</Label>
          <Input
            type="text"
            id="vehicle_make"
            value={vehicleMake}
            onChange={(e) => onVehicleMakeChange(e.target.value)}
            placeholder="مثل: تويوتا، نيسان..."
          />
        </div>

        <div>
          <Label htmlFor="vehicle_model">موديل المركبة</Label>
          <Input
            type="text"
            id="vehicle_model"
            value={vehicleModel}
            onChange={(e) => onVehicleModelChange(e.target.value)}
            placeholder="مثل: كامري، التيما..."
          />
        </div>

        <div>
          <Label htmlFor="vehicle_year">سنة الصنع</Label>
          <Input
            type="number"
            id="vehicle_year"
            value={vehicleYear}
            onChange={(e) => onVehicleYearChange(Number(e.target.value))}
            min="1950"
            max={new Date().getFullYear() + 2}
          />
        </div>

        <div>
          <Label htmlFor="vehicle_color">لون المركبة</Label>
          <Input
            type="text"
            id="vehicle_color"
            value={vehicleColor}
            onChange={(e) => onVehicleColorChange(e.target.value)}
            placeholder="مثل: أبيض، أسود..."
          />
        </div>

        <div>
          <Label htmlFor="vehicle_plate_number">رقم اللوحة</Label>
          <Input
            type="text"
            id="vehicle_plate_number"
            value={vehiclePlateNumber}
            onChange={(e) => onVehiclePlateNumberChange(e.target.value)}
            placeholder="رقم لوحة المركبة"
          />
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsSection;
