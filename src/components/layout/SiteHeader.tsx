import { Link } from 'react-router-dom';
import SafarLogo from '@/components/brand/VogantraLogo';
import { Button } from '@/components/ui/button';

export default function SiteHeader() {
  return (
    <header className="border-b bg-background" dir="rtl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link to="/" aria-label="الصفحة الرئيسية لسفر ERP"><SafarLogo size="sm" /></Link>
        <nav aria-label="روابط الموقع" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link className="hover:underline" to="/about">عن سفر ERP</Link>
          <Link className="hover:underline" to="/pricing">الباقات</Link>
          <Link className="hover:underline" to="/contact">الدعم</Link>
          <Button asChild size="sm"><Link to="/login">تسجيل الدخول</Link></Button>
        </nav>
      </div>
    </header>
  );
}
