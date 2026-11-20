import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export default function PublicCompanyPage({ page }: { page: 'about' | 'contact' }) {
  const about = page === 'about';
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-12">
        <h1 className="text-3xl font-bold">{about ? 'عن سفر ERP' : 'دعم سفر ERP'}</h1>
        {about ? (
          <>
            <p className="text-muted-foreground">سفر ERP منصة لشركات السياحة لإدارة الحجوزات وعروض الأسعار والعملاء والموردين والحسابات في مساحة عمل واحدة.</p>
            <Button asChild><Link to="/pricing">شوف الباقات</Link></Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">لو شركتك بتستخدم سفر ERP، افتح تذكرة من مركز الدعم بعد تسجيل الدخول. لو بتقارن قبل الاشتراك، راجع الباقات المتاحة.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild><Link to="/support">مركز الدعم</Link></Button>
              <Button asChild variant="outline"><Link to="/pricing">الباقات</Link></Button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
