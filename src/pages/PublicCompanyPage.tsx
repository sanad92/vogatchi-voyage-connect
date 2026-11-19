import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { publicSiteContact } from '@/components/layout/publicSiteContact';

export default function PublicCompanyPage({ page }: { page: 'about' | 'contact' }) {
  const about = page === 'about';
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold">{about ? 'عن الشركة' : 'تواصل معنا'}</h1>
        {about ? (
          <>
            <p className="text-lg">{publicSiteContact.name}</p>
            <p className="text-muted-foreground">نساعدك في الاستفسار عن حجز الفنادق والطيران وتأجير السيارات والباقات السياحية.</p>
            <Button asChild><Link to="/contact">تواصل معنا</Link></Button>
          </>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={publicSiteContact.whatsApp} target="_blank" rel="noopener noreferrer">تواصل عبر واتساب</a>
            </Button>
            <Button asChild variant="outline">
              <a dir="ltr" href={publicSiteContact.telephone}>{publicSiteContact.phoneLabel}</a>
            </Button>
            <Button asChild variant="outline">
              <a dir="ltr" href={`mailto:${publicSiteContact.email}`}>{publicSiteContact.email}</a>
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
