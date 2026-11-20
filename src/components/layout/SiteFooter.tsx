import { Link } from 'react-router-dom';
import SafarLogo from '@/components/brand/VogantraLogo';

export default function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30" dir="rtl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
        <Link to="/" aria-label="الصفحة الرئيسية لسفر ERP"><SafarLogo size="sm" /></Link>
        <nav aria-label="الدعم والسياسات" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link className="hover:underline" to="/contact">الدعم</Link>
          <Link className="hover:underline" to="/privacy">سياسة الخصوصية</Link>
          <Link className="hover:underline" to="/terms">الشروط والأحكام</Link>
          <Link className="hover:underline" to="/refund-policy">سياسة الاسترداد</Link>
        </nav>
      </div>
    </footer>
  );
}
