import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import TechStackMarquee from '@/components/landing/TechStackMarquee';
import StatsSection from '@/components/landing/StatsSection';
import ServicesSection from '@/components/landing/ServicesSection';
import IndustriesSection from '@/components/landing/IndustriesSection';
import LandingFooter from '@/components/landing/LandingFooter';
import { useLandingWhatsApp } from '@/hooks/useLandingWhatsApp';

const LandingPage = () => {
  const { createWhatsAppHandler } = useLandingWhatsApp();
  const handleWhatsAppClick = createWhatsAppHandler();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <LandingHeader onWhatsAppClick={handleWhatsAppClick} />
      <LandingHero onWhatsAppClick={handleWhatsAppClick} />
      <TechStackMarquee />
      <StatsSection />
      <ServicesSection />
      <IndustriesSection />
      <LandingFooter onWhatsAppClick={handleWhatsAppClick} />
    </div>
  );
};

export default LandingPage;
