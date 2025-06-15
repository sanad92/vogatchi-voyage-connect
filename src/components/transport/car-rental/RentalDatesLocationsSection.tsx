
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface RentalDatesLocationsSectionProps {
  formData: {
    rental_start_date: string;
    rental_end_date: string;
    rental_duration_days: string;
    pickup_location: string;
    return_location: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const RentalDatesLocationsSection = ({
  formData,
  onInputChange
}: RentalDatesLocationsSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="rental_start_date">تاريخ بداية الإيجار</Label>
        <Input
          type="date"
          id="rental_start_date"
          name="rental_start_date"
          value={formData.rental_start_date}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="rental_end_date">تاريخ نهاية الإيجار</Label>
        <Input
          type="date"
          id="rental_end_date"
          name="rental_end_date"
          value={formData.rental_end_date}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="rental_duration_days">مدة الإيجار (أيام)</Label>
        <Input
          type="number"
          id="rental_duration_days"
          name="rental_duration_days"
          value={formData.rental_duration_days}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="pickup_location">مكان الاستلام</Label>
        <Input
          type="text"
          id="pickup_location"
          name="pickup_location"
          value={formData.pickup_location}
          onChange={onInputChange}
        />
      </div>
      <div>
        <Label htmlFor="return_location">مكان التسليم</Label>
        <Input
          type="text"
          id="return_location"
          name="return_location"
          value={formData.return_location}
          onChange={onInputChange}
        />
      </div>
    </div>
  );
};

export default RentalDatesLocationsSection;
