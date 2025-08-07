import React from 'react';
import { BlockData, HeroBlockContent } from '@/types/blocks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLandingWhatsApp } from '@/hooks/useLandingWhatsApp';

interface HeroBlockProps {
  block: BlockData;
}

const HeroBlock: React.FC<HeroBlockProps> = ({ block }) => {
  const content = block.content as HeroBlockContent;
  const { createWhatsAppHandler } = useLandingWhatsApp();

  const handleButtonClick = (action: string) => {
    if (action === 'whatsapp') {
      const handler = createWhatsAppHandler();
      handler();
    } else if (action.startsWith('http')) {
      window.open(action, '_blank');
    } else if (action.startsWith('/')) {
      window.location.href = action;
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center relative overflow-hidden">
      {content.background_image && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{ backgroundImage: `url(${content.background_image})` }}
        />
      )}
      
      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
            {content.main_title}
          </h1>
          
          {content.subtitle && (
            <p className="text-xl md:text-2xl text-primary font-semibold">
              {content.subtitle}
            </p>
          )}
          
          {content.description && (
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {content.description}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            onClick={() => handleButtonClick(content.primary_button_action)}
            className="text-lg px-8 py-6 h-auto"
          >
            {content.primary_button_text}
          </Button>
          
          {content.secondary_button_text && content.secondary_button_action && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleButtonClick(content.secondary_button_action)}
              className="text-lg px-8 py-6 h-auto"
            >
              {content.secondary_button_text}
            </Button>
          )}
        </div>

        {content.stats && content.stats.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 pt-8">
            {content.stats.map((stat, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-lg px-6 py-3 h-auto"
              >
                <span className="font-bold text-primary">{stat.number}</span>
                <span className="mr-2">{stat.label}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroBlock;