import React from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import ServicesSection from '@/components/landing/ServicesSection';
import LandingFooter from '@/components/landing/LandingFooter';
import { useLandingWhatsApp } from '@/hooks/useLandingWhatsApp';

// Vogantra ERP Landing Page
const LandingPage = () => {
  const { createWhatsAppHandler } = useLandingWhatsApp();
  const handleWhatsAppClick = createWhatsAppHandler();

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader onWhatsAppClick={handleWhatsAppClick} />
      <LandingHero onWhatsAppClick={handleWhatsAppClick} />
      <ServicesSection />
      <LandingFooter onWhatsAppClick={handleWhatsAppClick} />
    </div>
  );
};

export default LandingPage;
