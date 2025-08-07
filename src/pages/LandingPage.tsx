
import React from 'react';
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

const LandingPage = () => {
  const { createWhatsAppHandler } = useLandingWhatsApp();
  const handleWhatsAppClick = createWhatsAppHandler();

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
