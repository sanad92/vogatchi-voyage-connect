import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { loadPublicCmsPage, publicPageSlugPattern, publicSiteSlugPattern } from '@/lib/publicBooking';

export default function PublicCmsPage() {
  const { companySlug = '', pageSlug = '' } = useParams();
  const validSlugs = publicSiteSlugPattern.test(companySlug) && publicPageSlugPattern.test(pageSlug);
  const page = useQuery({
    queryKey: ['public-cms-page', companySlug, pageSlug],
    queryFn: () => loadPublicCmsPage(companySlug, pageSlug),
    enabled: validSlugs,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  return (
    <main dir="rtl" className="mx-auto min-h-screen max-w-4xl space-y-8 px-4 py-12">
      {page.isLoading && <p role="status">جارٍ تحميل الصفحة…</p>}
      {page.isError && (
        <div role="alert" className="space-y-3">
          <p>تعذّر تحميل الصفحة.</p>
          <Button variant="outline" onClick={() => void page.refetch()}>إعادة المحاولة</Button>
        </div>
      )}
      {(!validSlugs || page.isSuccess) && !page.data && <h1 className="text-2xl font-semibold">الصفحة غير متاحة</h1>}
      {page.data && !page.isError && (
        <>
          <header className="space-y-3 border-b pb-6">
            <p className="text-sm text-muted-foreground">{page.data.company}</p>
            <h1 className="text-3xl font-bold">{page.data.title}</h1>
            {page.data.description && <p className="whitespace-pre-wrap break-words">{page.data.description}</p>}
          </header>
          {page.data.sections.map((section, index) => (
            <section key={index} className="space-y-3">
              {section.title && <h2 className="text-xl font-semibold">{section.title}</h2>}
              <p className="whitespace-pre-wrap break-words">{section.text}</p>
            </section>
          ))}
          {page.data.acceptsBooking && (
            <Button asChild><Link to={`/p/${companySlug}/booking-request`}>طلب عرض سعر</Link></Button>
          )}
        </>
      )}
    </main>
  );
}
