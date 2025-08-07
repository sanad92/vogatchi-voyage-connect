import React from 'react';
import { BlockData, CitiesBlockContent } from '@/types/blocks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin } from 'lucide-react';
import { useLandingWhatsApp } from '@/hooks/useLandingWhatsApp';

interface CitiesBlockProps {
  block: BlockData;
}

const CitiesBlock: React.FC<CitiesBlockProps> = ({ block }) => {
  const content = block.content as CitiesBlockContent;
  const { createWhatsAppHandler } = useLandingWhatsApp();

  const handleExploreClick = () => {
    const handler = createWhatsAppHandler('أريد المزيد من المعلومات حول الوجهات السياحية المتاحة');
    handler();
  };

  const columns = block.layout_settings.columns || 3;
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
        {content.destinations.map((destination) => (
          <Card key={destination.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="relative overflow-hidden">
              <img 
                src={destination.image} 
                alt={destination.name}
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary text-primary-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{destination.rating}</span>
                  </div>
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-2">{destination.name}</h3>
              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 mr-2" />
                {destination.name}
              </div>
              <div className="space-y-2">
                {destination.attractions.map((attraction, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {attraction}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button size="lg" onClick={handleExploreClick}>
          {content.explore_button_text}
        </Button>
      </div>
    </div>
  );
};

export default CitiesBlock;