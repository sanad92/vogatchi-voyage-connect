import React from 'react';
import { BlockData, DirectContractsBlockContent } from '@/types/blocks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel, Shield, Clock, Star } from 'lucide-react';
import { useLandingWhatsApp } from '@/hooks/useLandingWhatsApp';

interface DirectContractsBlockProps {
  block: BlockData;
}

const getIconComponent = (iconName: string) => {
  const icons = {
    Hotel,
    Shield,
    Clock,
    Star,
  };
  return icons[iconName as keyof typeof icons] || Hotel;
};

const DirectContractsBlock: React.FC<DirectContractsBlockProps> = ({ block }) => {
  const content = block.content as DirectContractsBlockContent;
  const { createWhatsAppHandler } = useLandingWhatsApp();

  const handleWhatsAppClick = createWhatsAppHandler();

  const columns = block.layout_settings.columns || 2;
  const gap = block.layout_settings.grid_gap || 'lg';
  
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };
  
  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-10',
  };

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          {content.section_title}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {content.section_description}
        </p>
      </div>

      <div className={`grid ${gridClasses[columns as keyof typeof gridClasses]} ${gapClasses[gap as keyof typeof gapClasses]}`}>
        {content.contracts.map((contract) => {
          const IconComponent = getIconComponent(contract.icon);

          return (
            <Card key={contract.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <CardContent className="p-8 space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <IconComponent className="h-10 w-10 text-primary" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-foreground">
                    {contract.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {contract.description}
                  </p>
                </div>
                
                <Button
                  onClick={handleWhatsAppClick}
                  className="w-full"
                  size="lg"
                >
                  {contract.button_text}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DirectContractsBlock;