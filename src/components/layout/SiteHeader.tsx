import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Phone, Mail, MapPin } from 'lucide-react';

const SiteHeader = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'الرئيسية', href: '/', ariaLabel: 'الصفحة الرئيسية' },
    { name: 'عنا', href: '/about', ariaLabel: 'حول الشركة' },
    { name: 'الخدمات', href: '/#services', ariaLabel: 'خدماتنا' },
    { name: 'اتصل بنا', href: '/contact', ariaLabel: 'تواصل معنا' },
  ];

  const handleNavClick = () => {
    setIsOpen(false);
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/201103442881?text=مرحباً، أريد الاستفسار عن خدماتكم السياحية', '_blank');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar */}
      <div className="bg-primary/10 py-2">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>01103442881</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>ops@vogatchitrips.com</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>الرياض، المملكة العربية السعودية</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" aria-label="فوجاتشي للتسويق السياحي">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              ف
            </div>
            <span className="hidden font-bold sm:inline-block">فوجاتشي للتسويق السياحي</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 space-x-reverse">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
                aria-label={item.ariaLabel}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleWhatsAppClick}
              className="hidden sm:inline-flex"
              size="sm"
            >
              احجز الآن
            </Button>
            
            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">فتح القائمة</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px] sm:w-[300px]">
                <div className="flex flex-col space-y-4 mt-4">
                  <Link
                    to="/"
                    className="flex items-center space-x-2 px-2"
                    onClick={handleNavClick}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      ف
                    </div>
                    <span className="font-bold">فوجاتشي</span>
                  </Link>
                  
                  <nav className="flex flex-col space-y-2">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block px-2 py-2 text-sm font-medium transition-colors hover:text-primary rounded-md hover:bg-muted"
                        onClick={handleNavClick}
                        aria-label={item.ariaLabel}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>

                  <div className="border-t pt-4">
                    <Button
                      onClick={() => {
                        handleWhatsAppClick();
                        handleNavClick();
                      }}
                      className="w-full"
                      size="sm"
                    >
                      احجز الآن
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;