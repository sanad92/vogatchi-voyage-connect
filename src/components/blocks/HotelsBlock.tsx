import React from 'react';
import { BlockData, HotelsBlockContent } from '@/types/blocks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, CheckCircle } from 'lucide-react';

interface HotelsBlockProps {
  block: BlockData;
}

const HotelsBlock: React.FC<HotelsBlockProps> = ({ block }) => {
  const content = block.content as HotelsBlockContent;

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
        {content.hotels.map((hotel) => (
          <Card key={hotel.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="relative overflow-hidden">
              <img 
                src={hotel.image} 
                alt={hotel.name}
                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-4 right-4">
                <Badge className="bg-yellow-500 text-white px-3 py-1">
                  <div className="flex items-center">
                    {Array.from({ length: hotel.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </Badge>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <Badge className="bg-green-500 text-white w-full justify-center py-2">
                  الدفع عند الوصول متاح
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-2">{hotel.name}</h3>
              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 mr-2" />
                {hotel.location}
              </div>
              <div className="space-y-2">
                {hotel.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    {feature}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HotelsBlock;