import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, MessageCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CTASectionProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'compact' | 'banner';
  className?: string;
}

const CTASection: React.FC<CTASectionProps> = ({
  title = "احجز رحلتك القادمة الآن",
  description = "استمتع بأفضل العروض والخدمات السياحية المتميزة مع فريقنا المختص",
  variant = 'default',
  className = ''
}) => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/201103442881?text=مرحباً، أريد الاستفسار عن خدماتكم السياحية', '_blank');
  };

  const handlePhoneClick = () => {
    window.open('tel:+201103442881', '_self');
  };

  if (variant === 'compact') {
    return (
      <div className={`py-8 ${className}`}>
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={handleWhatsAppClick} size="sm">
                <MessageCircle className="h-4 w-4 mr-2" />
                واتساب
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/booking-request">
                  <Calendar className="h-4 w-4 mr-2" />
                  طلب عرض
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`py-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground ${className}`}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{title}</h2>
          <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">{description}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleWhatsAppClick}
              size="lg"
              variant="secondary"
              className="text-primary"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              تواصل عبر واتساب
            </Button>
            <Button
              onClick={handlePhoneClick}
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary"
            >
              <Phone className="h-5 w-5 mr-2" />
              اتصل الآن
            </Button>
              <Button size="lg" variant="secondary" asChild className="text-primary">
                <Link to="/booking-request">
                  <Calendar className="h-5 w-5 mr-2" />
                  احجز رحلتك
                </Link>
              </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <section className={`py-16 ${className}`}>
      <div className="container mx-auto px-4">
        <Card className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{title}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {description}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md mx-auto">
              <Button
                onClick={handleWhatsAppClick}
                size="lg"
                className="w-full"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                واتساب
              </Button>
              
              <Button
                onClick={handlePhoneClick}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Phone className="h-5 w-5 mr-2" />
                اتصل الآن
              </Button>
              
              <Button size="lg" variant="secondary" asChild className="w-full">
                <Link to="/booking-request">
                  <Calendar className="h-5 w-5 mr-2" />
                  احجز الآن
                </Link>
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span>دعم 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span>أفضل الأسعار</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                  <span>خدمة مميزة</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CTASection;