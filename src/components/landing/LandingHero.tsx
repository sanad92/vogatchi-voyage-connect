
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, Users, Building2, MessageSquare, Zap } from 'lucide-react';

interface LandingHeroProps {
  onWhatsAppClick: () => void;
}

const LandingHero = ({ onWhatsAppClick }: LandingHeroProps) => {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10"></div>
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            رحلتك المميزة تبدأ 
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
              من هنا
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر 
            مع ضمان الجودة والأسعار التنافسية
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Shield className="h-4 w-4 mr-2" />
              مرخص رسمياً
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Users className="h-4 w-4 mr-2" />
              +10,000 عميل راضي
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Building2 className="h-4 w-4 mr-2" />
              تعاقد مباشر مع الفنادق
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Clock className="h-4 w-4 mr-2" />
              خدمة 24/7
            </Badge>
          </div>
          
          {/* WhatsApp CTA */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <MessageSquare className="h-6 w-6 text-green-600" />
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="text-lg font-bold text-green-800 mb-2">
              تواصل معنا عبر الواتساب الآن واحصل على خصم فوري!
            </h3>
            <p className="text-green-700 mb-4">
              استشارة مجانية وعروض حصرية لعملاء الواتساب
            </p>
            <Button
              onClick={onWhatsAppClick}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              ابدأ المحادثة الآن
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
