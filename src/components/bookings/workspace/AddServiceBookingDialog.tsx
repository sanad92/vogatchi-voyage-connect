import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ParentBookingProvider } from '@/contexts/ParentBookingContext';
import HotelBookingForm from '@/components/hotel-bookings/HotelBookingForm';
import FlightBookingFormEnhanced from '@/components/flight-bookings/FlightBookingFormEnhanced';
import EnhancedTransportBookingForm from '@/components/transport/EnhancedTransportBookingForm';
import EnhancedCarRentalForm from '@/components/transport/EnhancedCarRentalForm';
import type { ServiceKind } from '@/hooks/useBookingServices';

const TITLES: Record<ServiceKind, string> = {
  hotel: 'إضافة حجز فندق إلى ملف العميل',
  flight: 'إضافة حجز طيران إلى ملف العميل',
  transport: 'إضافة انتقالات إلى ملف العميل',
  car: 'إضافة تأجير سيارة إلى ملف العميل',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ServiceKind;
  bookingId: string;
  bookingNumber?: string | null;
  bookingCustomerId?: string | null;
  bookingCustomerName?: string | null;
  bookingCurrency?: string | null;
  onSaved: () => void;
}

export const AddServiceBookingDialog = ({
  open,
  onOpenChange,
  kind,
  bookingId,
  bookingNumber,
  bookingCustomerId,
  bookingCustomerName,
  bookingCurrency,
  onSaved,
}: Props) => {
  const handleSuccess = () => {
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {TITLES[kind]}
            {bookingNumber ? (
              <span className="block text-sm font-normal text-muted-foreground mt-1">
                هتتربط الخدمة بملف الحجز {bookingNumber} وتتحدّث الفاتورة المسودة لو موجودة
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <ParentBookingProvider
          bookingId={bookingId}
          customer={bookingCustomerId ? { id: bookingCustomerId, name: bookingCustomerName || 'عميل الحجز' } : null}
          currency={bookingCurrency}
        >
          {kind === 'hotel' && (
            <HotelBookingForm onSuccess={handleSuccess} onCancel={() => onOpenChange(false)} />
          )}
          {kind === 'flight' && <FlightBookingFormEnhanced onSuccess={handleSuccess} />}
          {kind === 'transport' && <EnhancedTransportBookingForm onSuccess={handleSuccess} />}
          {kind === 'car' && <EnhancedCarRentalForm onSuccess={handleSuccess} />}
        </ParentBookingProvider>
      </DialogContent>
    </Dialog>
  );
};
