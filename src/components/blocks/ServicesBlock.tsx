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
        {content.services.map((service) => {
          const IconComponent = getIconComponent(service.icon);
          const colorClass = getColorClass(service.color);

          return (
            <Card key={service.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center space-y-4">
                <div className={`w-16 h-16 ${colorClass} rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300`}>
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