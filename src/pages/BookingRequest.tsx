import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BookingRequestForm from '@/components/booking-request/BookingRequestForm';

const BookingRequest = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-center">طلب عرض سعر</h1>
          <BookingRequestForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default BookingRequest;
