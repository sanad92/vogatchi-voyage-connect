
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface RentalDatesLocationsSectionProps {
  rentalStartDate: string;
  rentalEndDate: string;
  rentalDurationDays: number;
  pickupLocation: string;
  returnLocation: string;
  onRentalStartDateChange: (date: string) => void;
  onRentalEndDateChange: (date: string) => void;
  onPickupLocationChange: (location: string) => void;
  onReturnLocationChange: (location: string) => void;
  errors?: Record<string, string>;
}

const RentalDatesLocationsSection = ({
  rentalStartDate,
  rentalEndDate,
  rentalDurationDays,
  pickupLocation,
  returnLocation,
  onRentalStartDateChange,
  onRentalEndDateChange,
  onPickupLocationChange,
  onReturnLocationChange,
  errors = {}
}: RentalDatesLocationsSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        التواريخ والمواقع
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="rental_start_date">تاريخ بداية الإيجار</Label>
          <Input
            type="date"
            id="rental_start_date"
            value={rentalStartDate}
            onChange={(e) => onRentalStartDateChange(e.target.value)}
            required
          />
          {errors.rental_start_date && (
            <p className="text-sm text-red-600 mt-1">{errors.rental_start_date}</p>
          )}
        </div>

        <div>
          <Label htmlFor="rental_end_date">تاريخ نهاية الإيجار</Label>
          <Input
            type="date"
            id="rental_end_date"
            value={rentalEndDate}
            onChange={(e) => onRentalEndDateChange(e.target.value)}
            required
          />
          {errors.rental_end_date && (
            <p className="text-sm text-red-600 mt-1">{errors.rental_end_date}</p>
          )}
        </div>

        <div>
          <Label htmlFor="rental_duration_days" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            مدة الإيجار (أيام)
          </Label>
          <Input
            type="number"
            id="rental_duration_days"
            value={rentalDurationDays}
            readOnly
            className="bg-gray-50"
          />
        </div>

        <div>
          <Label htmlFor="pickup_location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            مكان الاستلام
          </Label>
          <Input
            type="text"
            id="pickup_location"
            value={pickupLocation}
            onChange={(e) => onPickupLocationChange(e.target.value)}
            placeholder="أدخل مكان استلام المركبة"
            required
          />
          {errors.pickup_location && (
            <p className="text-sm text-red-600 mt-1">{errors.pickup_location}</p>
          )}
        </div>

        <div>
          <Label htmlFor="return_location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            مكان التسليم
          </Label>
          <Input
            type="text"
            id="return_location"
            value={returnLocation}
            onChange={(e) => onReturnLocationChange(e.target.value)}
            placeholder="أدخل مكان تسليم المركبة"
            required
          />
          {errors.return_location && (
            <p className="text-sm text-red-600 mt-1">{errors.return_location}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentalDatesLocationsSection;
