
import React from 'react';
// موجود مسبقاً:
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import DirectContracts from '@/components/landing/DirectContracts';
import CitiesSection from '@/components/landing/CitiesSection';
import ServicesSection from '@/components/landing/ServicesSection';
import HotelsSection from '@/components/landing/HotelsSection';
import ContactForm from '@/components/landing/ContactForm';
import LandingFooter from '@/components/landing/LandingFooter';
import WhatsAppFixedButton from '@/components/landing/WhatsAppFixedButton';
import { useLandingWhatsApp } from '@/hooks/useLandingWhatsApp';

// إضافات ديناميكية:
import { usePageBlocks } from '@/hooks/cms/usePageBlocks';
import BlockRenderer from '@/components/cms/BlockRenderer';

const LandingPage = () => {
  const { createWhatsAppHandler } = useLandingWhatsApp();
  const handleWhatsAppClick = createWhatsAppHandler();

  // نجلب صفحة "home" ديناميكياً:
  const { blocks, isLoading } = usePageBlocks('home');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  // إذا وُجدت بلوكات مفعلة في قاعدة البيانات، نعرضها بالكامل
  if (blocks && blocks.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <LandingHeader onWhatsAppClick={handleWhatsAppClick} />
        <WhatsAppFixedButton onWhatsAppClick={handleWhatsAppClick} />
        <BlockRenderer blocks={blocks} />
        <LandingFooter onWhatsAppClick={handleWhatsAppClick} />
      </div>
    );
  }

  // نسخة احتياطية: التصميم القديم كما هو في حال لا توجد بيانات ديناميكية بعد
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <LandingHeader onWhatsAppClick={handleWhatsAppClick} />
      <WhatsAppFixedButton onWhatsAppClick={handleWhatsAppClick} />
      <LandingHero onWhatsAppClick={handleWhatsAppClick} />
      <DirectContracts onWhatsAppClick={handleWhatsAppClick} />
      <CitiesSection />
      <ServicesSection />
      <HotelsSection />
      <ContactForm onWhatsAppClick={handleWhatsAppClick} />
      <LandingFooter onWhatsAppClick={handleWhatsAppClick} />
    </div>
  );
};

export default LandingPage;

