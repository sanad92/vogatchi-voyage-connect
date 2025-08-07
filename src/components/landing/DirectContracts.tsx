
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
    <section className="py-16 lg:py-20 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-white/10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center text-white mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <Handshake className="h-12 w-12 lg:h-16 lg:w-16" />
            </div>
          </div>
          
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-6 leading-tight">
            {contractsContent?.title || 'تعاقد مباشر مع أفضل الفنادق'}
          </h2>
          
          <p className="text-lg lg:text-xl text-primary-foreground/90 max-w-4xl mx-auto leading-relaxed">
            {contractsContent?.content || 'نضمن لك أفضل الأسعار من خلال تعاقدنا المباشر مع الفنادق العالمية'}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all duration-300 group">
            <CardContent className="p-6 lg:p-8 text-center">
              <div className="bg-yellow-400/20 p-3 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Star className="h-8 w-8 lg:h-10 lg:w-10 text-yellow-400" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold mb-3">أفضل الأسعار</h3>
              <p className="text-primary-foreground/80 text-sm lg:text-base">
                أسعار حصرية لا تجدها في أي مكان آخر
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all duration-300 group">
            <CardContent className="p-6 lg:p-8 text-center">
              <div className="bg-green-400/20 p-3 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-8 w-8 lg:h-10 lg:w-10 text-green-400" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold mb-3">ضمان الجودة</h3>
              <p className="text-primary-foreground/80 text-sm lg:text-base">
                فنادق مُختارة بعناية لضمان إقامة مريحة
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all duration-300 group">
            <CardContent className="p-6 lg:p-8 text-center">
              <div className="bg-purple-400/20 p-3 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Award className="h-8 w-8 lg:h-10 lg:w-10 text-purple-400" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold mb-3">خدمة متميزة</h3>
              <p className="text-primary-foreground/80 text-sm lg:text-base">
                دعم مستمر قبل وأثناء وبعد رحلتك
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats and CTA */}
        <div className="text-center space-y-8">
          <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
            {[
              '+500 فندق شريك',
              'توفير حتى 40%',
              'إلغاء مجاني'
            ].map((stat, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors"
              >
                {stat}
              </Badge>
            ))}
          </div>
          
          <Button
            onClick={handleContactClick}
            size="lg"
            className="bg-white text-primary hover:bg-gray-50 px-8 lg:px-10 py-4 lg:py-5 text-lg lg:text-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <Handshake className="h-5 w-5 lg:h-6 lg:w-6 mr-2" />
            {contractsContent?.button_text || 'تواصل معنا الآن'}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DirectContracts;
