
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
    <section className="relative py-16 lg:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-5xl mx-auto text-center">
          {/* Main Heading */}
          <div className="space-y-6 mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              {heroContent?.title || 'رحلتك المميزة تبدأ من هنا'}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent block mt-2">
                {heroContent?.subtitle ? heroContent.subtitle.split(' - ')[0] : 'من هنا'}
              </span>
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {heroContent?.content || 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر مع ضمان الجودة والأسعار التنافسية'}
            </p>
          </div>
          
          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 lg:gap-4 mb-12">
              {badges.map((badge, index) => {
                const IconComponent = getIconComponent(badge.icon_name || 'Shield');
                return (
                  <Badge key={index} variant="secondary" className="px-4 py-2 text-sm lg:text-base bg-secondary/60 hover:bg-secondary/80 transition-colors">
                    <IconComponent className="h-4 w-4 mr-2" />
                    {badge.badge_text || badge.title}
                  </Badge>
                );
              })}
            </div>
          )}
          
          {/* WhatsApp CTA Card */}
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 lg:p-8 max-w-2xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-center gap-3 mb-4">
              <MessageSquare className="h-6 w-6 lg:h-7 lg:w-7 text-green-600" />
              <Zap className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-500 animate-pulse" />
            </div>
            
            <h3 className="text-lg lg:text-xl font-bold text-green-800 dark:text-green-400 mb-3">
              تواصل معنا عبر الواتساب الآن واحصل على خصم فوري!
            </h3>
            
            <p className="text-green-700 dark:text-green-300 mb-6 text-sm lg:text-base">
              استشارة مجانية وعروض حصرية لعملاء الواتساب
            </p>
            
            <Button
              onClick={onWhatsAppClick}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base lg:text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
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
