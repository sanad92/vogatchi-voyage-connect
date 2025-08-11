import React from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Card, CardContent } from '@/components/ui/card';

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <SiteHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">عن شركة فوجاتشي للسفر</h1>
            <p className="text-xl text-muted-foreground">أكثر من 15 سنة من الخبرة في خدمة السياحة والسفر</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">رؤيتنا</h2>
                <p className="text-muted-foreground">
                  أن نكون الشركة الرائدة في مجال السياحة والسفر، نقدم خدمات متميزة ونخلق تجارب لا تُنسى لعملائنا.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">مهمتنا</h2>
                <p className="text-muted-foreground">
                  نسعى لتقديم أفضل الخدمات السياحية بجودة عالية وأسعار منافسة، مع الحرص على رضا العملاء وتحقيق توقعاتهم.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardContent className="p-8">
              <h2 className="text-3xl font-semibold text-center mb-8">خدماتنا</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">حجز الفنادق</h3>
                  <p className="text-sm text-muted-foreground">أفضل الفنادق بأسعار مميزة</p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">حجز الطيران</h3>
                  <p className="text-sm text-muted-foreground">تذاكر طيران لجميع الوجهات</p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">تأجير السيارات</h3>
                  <p className="text-sm text-muted-foreground">سيارات حديثة ومريحة</p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">الباقات السياحية</h3>
                  <p className="text-sm text-muted-foreground">برامج سياحية متكاملة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
};

export default About;