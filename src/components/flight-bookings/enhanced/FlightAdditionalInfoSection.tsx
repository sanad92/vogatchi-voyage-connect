
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Hash, Utensils, Armchair } from 'lucide-react';

interface FlightAdditionalInfoSectionProps {
  bookingReference: string;
  confirmationNumber: string;
  specialRequests: string;
  mealPreferences: string;
  seatPreferences: string;
  onBookingReferenceChange: (value: string) => void;
  onConfirmationNumberChange: (value: string) => void;
  onSpecialRequestsChange: (value: string) => void;
  onMealPreferencesChange: (value: string) => void;
  onSeatPreferencesChange: (value: string) => void;
}

const FlightAdditionalInfoSection = ({
  bookingReference,
  confirmationNumber,
  specialRequests,
  mealPreferences,
  seatPreferences,
  onBookingReferenceChange,
  onConfirmationNumberChange,
  onSpecialRequestsChange,
  onMealPreferencesChange,
  onSeatPreferencesChange
}: FlightAdditionalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5" />
        معلومات إضافية
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="booking_reference" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            رقم الحجز
          </Label>
          <Input
            id="booking_reference"
            value={bookingReference}
            onChange={(e) => onBookingReferenceChange(e.target.value)}
            placeholder="رقم حجز الطيران"
          />
        </div>
        
        <div>
          <Label htmlFor="confirmation_number" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            رقم التأكيد
          </Label>
          <Input
            id="confirmation_number"
            value={confirmationNumber}
            onChange={(e) => onConfirmationNumberChange(e.target.value)}
            placeholder="رقم تأكيد الحجز"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="special_requests">طلبات خاصة</Label>
          <Textarea
            id="special_requests"
            value={specialRequests}
            onChange={(e) => onSpecialRequestsChange(e.target.value)}
            placeholder="أي طلبات خاصة"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="meal_preferences" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            تفضيلات الوجبات
          </Label>
          <Textarea
            id="meal_preferences"
            value={mealPreferences}
            onChange={(e) => onMealPreferencesChange(e.target.value)}
            placeholder="تفضيلات الوجبات"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="seat_preferences" className="flex items-center gap-2">
            <Armchair className="h-4 w-4" />
            تفضيلات المقاعد
          </Label>
          <Textarea
            id="seat_preferences"
            value={seatPreferences}
            onChange={(e) => onSeatPreferencesChange(e.target.value)}
            placeholder="تفضيلات المقاعد"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default FlightAdditionalInfoSection;
