import React from 'react';
import { useBlocks } from '@/hooks/useBlocksSimple';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import WhatsAppFixedButton from '@/components/landing/WhatsAppFixedButton';
import { useLandingWhatsApp } from '@/hooks/useLandingWhatsApp';
import { Skeleton } from '@/components/ui/skeleton';

const BlockBasedLanding = () => {
  const { createWhatsAppHandler } = useLandingWhatsApp();
  const handleWhatsAppClick = createWhatsAppHandler();
  const { blocks, isLoading, error } = useBlocks('landing');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <LandingHeader onWhatsAppClick={handleWhatsAppClick} />
        <WhatsAppFixedButton onWhatsAppClick={handleWhatsAppClick} />
        
        <div className="space-y-16 py-16">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="container mx-auto px-4">
              <Skeleton className="h-96 w-full" />
            </div>
          ))}
        </div>
        
        <LandingFooter onWhatsAppClick={handleWhatsAppClick} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">خطأ في تحميل الصفحة</h1>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <LandingHeader onWhatsAppClick={handleWhatsAppClick} />
      <WhatsAppFixedButton onWhatsAppClick={handleWhatsAppClick} />
      
      <main>
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </main>
      
      <LandingFooter onWhatsAppClick={handleWhatsAppClick} />
    </div>
  );
};

export default BlockBasedLanding;