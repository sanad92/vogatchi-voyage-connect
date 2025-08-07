import React from 'react';
import { BlockData, ServicesBlockContent } from '@/types/blocks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel, Plane, Car, Bus, MapPin, Calendar } from 'lucide-react';

interface ServicesBlockProps {
  block: BlockData;
}

const getIconComponent = (iconName: string) => {
  const icons = {
    Hotel,
    Plane,
    Car,
    Bus,
    MapPin,
    Calendar,
  };
  return icons[iconName as keyof typeof icons] || Hotel;
};

const getColorClass = (colorName: string) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
  };
  return colors[colorName as keyof typeof colors] || 'bg-blue-500';
};

const ServicesBlock: React.FC<ServicesBlockProps> = ({ block }) => {
  const content = block.content as ServicesBlockContent;

  const handleServiceClick = (buttonLink: string) => {
    if (buttonLink.startsWith('http')) {
      window.open(buttonLink, '_blank');
    } else if (buttonLink.startsWith('/')) {
      window.location.href = buttonLink;
    }
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
    <div className="space-y-12 relative">
      {/* خلفية متحركة للخدمات */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse delay-300" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce delay-100" />
      </div>
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          {content.section_title}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {content.section_description}
        </p>
      </div>

      <div className={`grid ${gridClasses[columns as keyof typeof gridClasses]} ${gapClasses[gap as keyof typeof gapClasses]} relative z-10`}>
        {content.services.map((service) => {
          const IconComponent = getIconComponent(service.icon);
          const colorClass = getColorClass(service.color);

          return (
            <Card key={service.id} className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 animate-fade-in hover-scale bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center space-y-4">
                <div className={`w-16 h-16 ${colorClass} rounded-full flex items-center justify-center mx-auto group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg animate-bounce`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground">
                  {service.title}
                </h3>
                
                <p className="text-muted-foreground">
                  {service.description}
                </p>
                
                {service.button_text && service.button_link && (
                  <Button
                    variant="outline"
                    onClick={() => handleServiceClick(service.button_link)}
                    className="w-full"
                  >
                    {service.button_text}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ServicesBlock;