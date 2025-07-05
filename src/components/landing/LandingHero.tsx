
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, Users, Building2, MessageSquare, Zap } from 'lucide-react';
import { useLandingContent } from '@/hooks/useLandingContent';

interface LandingHeroProps {
  onWhatsAppClick: () => void;
}

const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    Shield,
    Users,
    Building2,
    Clock,
    MessageSquare,
    Zap
  };
  return icons[iconName] || MessageSquare;
};

const LandingHero = ({ onWhatsAppClick }: LandingHeroProps) => {
  const { getContentBySection, isLoading } = useLandingContent();
  
  const heroContent = getContentBySection('hero').find(item => item.section_type === 'hero');
  const badges = getContentBySection('hero').filter(item => item.section_type === 'badges');

  if (isLoading) {
    return (
      <section className="relative py-20 overflow-hidden">
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="animate-pulse space-y-8">
              <div className="h-16 bg-gray-200 rounded mx-auto max-w-lg"></div>
              <div className="h-8 bg-gray-200 rounded mx-auto max-w-2xl"></div>
              <div className="flex justify-center gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-10 w-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10"></div>
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {heroContent?.title || 'رحلتك المميزة تبدأ من هنا'}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
              {heroContent?.subtitle ? heroContent.subtitle.split(' - ')[0] : 'من هنا'}
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {heroContent?.content || 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر مع ضمان الجودة والأسعار التنافسية'}
          </p>
          
          {badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {badges.map((badge, index) => {
                const IconComponent = getIconComponent(badge.icon_name || 'Shield');
                return (
                  <Badge key={index} variant="secondary" className="px-4 py-2 text-sm">
                    <IconComponent className="h-4 w-4 mr-2" />
                    {badge.badge_text || badge.title}
                  </Badge>
                );
              })}
            </div>
          )}
          
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
              {heroContent?.button_text || 'ابدأ المحادثة الآن'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
