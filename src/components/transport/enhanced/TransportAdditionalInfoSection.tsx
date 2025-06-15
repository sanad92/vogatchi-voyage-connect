
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, Phone, Car, FileText } from 'lucide-react';

interface TransportAdditionalInfoSectionProps {
  driverName: string;
  driverPhone: string;
  vehiclePlateNumber: string;
  specialRequests: string;
  onDriverNameChange: (name: string) => void;
  onDriverPhoneChange: (phone: string) => void;
  onVehiclePlateNumberChange: (plate: string) => void;
  onSpecialRequestsChange: (requests: string) => void;
}

const TransportAdditionalInfoSection = ({
  driverName,
  driverPhone,
  vehiclePlateNumber,
  specialRequests,
  onDriverNameChange,
  onDriverPhoneChange,
  onVehiclePlateNumberChange,
  onSpecialRequestsChange
}: TransportAdditionalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5" />
        معلومات إضافية
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="driver_name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            اسم السائق
          </Label>
          <Input
            id="driver_name"
            value={driverName}
            onChange={(e) => onDriverNameChange(e.target.value)}
            placeholder="اسم السائق"
          />
        </div>
        
        <div>
          <Label htmlFor="driver_phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            هاتف السائق
          </Label>
          <Input
            id="driver_phone"
            value={driverPhone}
            onChange={(e) => onDriverPhoneChange(e.target.value)}
            placeholder="هاتف السائق"
          />
        </div>
        
        <div>
          <Label htmlFor="vehicle_plate" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            رقم لوحة المركبة
          </Label>
          <Input
            id="vehicle_plate"
            value={vehiclePlateNumber}
            onChange={(e) => onVehiclePlateNumberChange(e.target.value)}
            placeholder="رقم لوحة المركبة"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="special_requests">طلبات خاصة</Label>
        <Textarea
          id="special_requests"
          value={specialRequests}
          onChange={(e) => onSpecialRequestsChange(e.target.value)}
          placeholder="أي طلبات خاصة أو ملاحظات"
          rows={3}
        />
      </div>
    </div>
  );
};

export default TransportAdditionalInfoSection;
