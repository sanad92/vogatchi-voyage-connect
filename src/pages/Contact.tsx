import React from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

const Contact = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/201103442881?text=مرحباً، أريد الاستفسار عن خدماتكم السياحية', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <SiteHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">تواصل معنا</h1>
            <p className="text-xl text-muted-foreground">نحن هنا لخدمتك على مدار الساعة</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6">معلومات التواصل</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">الهاتف</p>
                      <p className="text-muted-foreground">01103442881</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">البريد الإلكتروني</p>
                      <p className="text-muted-foreground">ops@hostretor.online</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">العنوان</p>
                      <p className="text-muted-foreground">القاهرة، مصر</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">ساعات العمل</p>
                      <p className="text-muted-foreground">24/7 - على مدار الساعة</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <Button 
                    onClick={handleWhatsAppClick}
                    className="w-full"
                    size="lg"
                  >
                    تواصل عبر واتساب
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6">لماذا تختار فوجاتشي؟</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">خبرة 15 سنة</h3>
                    <p className="text-sm text-muted-foreground">خبرة طويلة في مجال السياحة والسفر</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">خدمة 24/7</h3>
                    <p className="text-sm text-muted-foreground">نحن متاحون لخدمتك في أي وقت</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">أسعار منافسة</h3>
                    <p className="text-sm text-muted-foreground">أفضل الأسعار في السوق</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">خدمة شخصية</h3>
                    <p className="text-sm text-muted-foreground">نهتم بكل تفاصيل رحلتك</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
};

export default Contact;