import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const SiteFooter = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/201103442881?text=مرحباً، أريد الاستفسار عن خدماتكم السياحية', '_blank');
  };

  const quickLinks = [
    { name: 'حجز الفنادق', href: '/booking-request' },
    { name: 'حجز الطيران', href: '/booking-request' },
    { name: 'تأجير السيارات', href: '/booking-request' },
    { name: 'الباقات السياحية', href: '/booking-request' },
  ];

  const supportLinks = [
    { name: 'اتصل بنا', href: '/contact' },
    { name: 'عنا', href: '/about' },
    { name: 'الأسئلة الشائعة', href: '/contact' },
    { name: 'سياسة الخصوصية', href: '/contact' },
  ];

  const destinations = [
    { name: 'السعودية', href: '/p/booking-request' },
    { name: 'الإمارات', href: '/p/booking-request' },
    { name: 'مصر', href: '/p/booking-request' },
    { name: 'تركيا', href: '/p/booking-request' },
  ];

  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                ف
              </div>
              <span className="font-bold text-lg">فوجاتشي للتسويق السياحي</span>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              وجهتك المثالية للسفر والسياحة. نقدم خدمات متميزة في حجز الفنادق والطيران وتأجير السيارات مع أفضل الأسعار.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <span>01103442881</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>hello@vogantra.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>الرياض، المملكة العربية السعودية</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">خدماتنا</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Destinations */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">الوجهات الشائعة</h3>
            <ul className="space-y-2">
              {destinations.map((destination) => (
                <li key={destination.name}>
                  <Link
                    to={destination.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {destination.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Social */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">الدعم</h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  تسجيل دخول الموظفين
                </Link>
              </li>
            </ul>

            <div className="pt-4">
              <h4 className="font-medium mb-3">تابعنا</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="mt-12 p-6 bg-primary/10 rounded-lg text-center">
          <h3 className="text-xl font-bold mb-2">جاهز لرحلتك القادمة؟</h3>
          <p className="text-muted-foreground mb-4">
            احجز الآن واستمتع بأفضل العروض والخدمات المتميزة
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleWhatsAppClick} size="lg">
              احجز عبر واتساب
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/booking-request">طلب عرض سعر</Link>
            </Button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>© 2024 فوجاتشي للتسويق السياحي. جميع الحقوق محفوظة.</p>
            <div className="flex gap-4 mt-2 sm:mt-0">
              <Link to="/contact" className="hover:text-primary transition-colors">
                شروط الاستخدام
              </Link>
              <Link to="/contact" className="hover:text-primary transition-colors">
                سياسة الخصوصية
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;