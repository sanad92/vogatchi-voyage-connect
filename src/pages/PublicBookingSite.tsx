import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import BookingRequestForm from '@/components/booking-request/BookingRequestForm';
import { Button } from '@/components/ui/button';
import { loadPublicBookingSite, publicSiteSlugPattern, submitPublicBookingRequest } from '@/lib/publicBooking';

export default function PublicBookingSite() {
  const { companySlug = '' } = useParams();
  const validSlug = publicSiteSlugPattern.test(companySlug);
  const site = useQuery({
    queryKey: ['public-booking-site', companySlug],
    queryFn: () => loadPublicBookingSite(companySlug),
    enabled: validSlug,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  return (
    <main dir="rtl" className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold">{site.data ? `طلب عرض سعر من ${site.data.name}` : 'طلب عرض سعر'}</h1>
      {site.isLoading && <p role="status">جارٍ تحميل بيانات الشركة…</p>}
      {site.isError && (
        <div role="alert" className="space-y-3">
          <p>تعذّر تحميل صفحة استقبال الطلبات.</p>
          <Button variant="outline" onClick={() => void site.refetch()}>إعادة المحاولة</Button>
        </div>
      )}
      {(!validSlug || site.isSuccess) && !site.data && <BookingRequestForm />}
      {site.data && !site.isError && (
        <BookingRequestForm
          key={companySlug}
          onSubmit={(data, requestKey) => submitPublicBookingRequest(companySlug, requestKey, data)}
        />
      )}
    </main>
  );
}
