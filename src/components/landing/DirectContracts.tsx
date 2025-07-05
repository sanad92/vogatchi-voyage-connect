
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Handshake, Star, Shield, Award } from 'lucide-react';
import { useLandingContent } from '@/hooks/useLandingContent';

interface DirectContractsProps {
  onWhatsAppClick?: () => void;
}

const DirectContracts = ({ onWhatsAppClick }: DirectContractsProps) => {
  const { getContentBySection, isLoading } = useLandingContent();
  
  const contractsContent = getContentBySection('contracts').find(item => item.section_type === 'section');

  const handleContactClick = () => {
    if (onWhatsAppClick) {
      onWhatsAppClick();
    } else {
      const phoneNumber = "201103442881";
      const message = "مرحباً، أريد الاستفسار عن العقود المباشرة مع الفنادق";
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="text-center space-y-4">
              <div className="h-12 bg-white/20 rounded mx-auto max-w-lg"></div>
              <div className="h-6 bg-white/20 rounded mx-auto max-w-2xl"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="container mx-auto px-4">
        <div className="text-center text-white mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Handshake className="h-12 w-12" />
          </div>
          <h2 className="text-4xl font-bold mb-6">
            {contractsContent?.title || 'تعاقد مباشر مع أفضل الفنادق'}
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            {contractsContent?.content || 'نضمن لك أفضل الأسعار من خلال تعاقدنا المباشر مع الفنادق العالمية'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
              <h3 className="text-xl font-bold mb-3">أفضل الأسعار</h3>
              <p className="text-blue-100">
                أسعار حصرية لا تجدها في أي مكان آخر
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <h3 className="text-xl font-bold mb-3">ضمان الجودة</h3>
              <p className="text-blue-100">
                فنادق مُختارة بعناية لضمان إقامة مريحة
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <Award className="h-12 w-12 mx-auto mb-4 text-purple-400" />
              <h3 className="text-xl font-bold mb-3">خدمة متميزة</h3>
              <p className="text-blue-100">
                دعم مستمر قبل وأثناء وبعد رحلتك
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-6">
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Badge variant="secondary" className="px-6 py-2 text-base bg-white/20 text-white border-white/30">
              +500 فندق شريك
            </Badge>
            <Badge variant="secondary" className="px-6 py-2 text-base bg-white/20 text-white border-white/30">
              توفير حتى 40%
            </Badge>
            <Badge variant="secondary" className="px-6 py-2 text-base bg-white/20 text-white border-white/30">
              إلغاء مجاني
            </Badge>
          </div>
          
          <Button
            onClick={handleContactClick}
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <Handshake className="h-5 w-5 mr-2" />
            {contractsContent?.button_text || 'تواصل معنا الآن'}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DirectContracts;
