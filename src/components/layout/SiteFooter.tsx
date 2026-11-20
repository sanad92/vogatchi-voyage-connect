import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { publicSiteContact } from './publicSiteContact';

const links = [
  { name: 'عن الشركة', href: '/about' },
  { name: 'اتصل بنا', href: '/contact' },
  { name: 'تسجيل دخول الموظفين', href: '/login' },
  { name: 'سياسة الخصوصية', href: '/privacy' },
  { name: 'حذف البيانات', href: '/data-deletion' },
];

const SiteFooter = () => (
  <footer dir="rtl" className="border-t bg-muted/50">
    <div className="container mx-auto grid gap-8 px-4 py-10 sm:grid-cols-2">
      <div className="space-y-3">
        <p className="text-lg font-semibold">{publicSiteContact.name}</p>
        <p className="text-sm text-muted-foreground">
          استفسر عن الفنادق والطيران وتأجير السيارات والباقات السياحية.
        </p>
        <Button asChild>
          <a href={publicSiteContact.whatsApp} target="_blank" rel="noopener noreferrer">تواصل عبر واتساب</a>
        </Button>
      </div>
      <nav aria-label="روابط الموقع" className="flex flex-wrap items-start justify-start gap-x-5 gap-y-3 sm:justify-end">
        {links.map(link => (
          <Link className="text-sm text-muted-foreground hover:text-primary" key={link.href} to={link.href}>
            {link.name}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);

export default SiteFooter;
