import React from 'react';
import { BlockData, StatisticsBlockContent } from '@/types/blocks';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Star, MapPin, Calendar } from 'lucide-react';

interface StatisticsBlockProps {
  block: BlockData;
}

const getIconComponent = (iconName: string) => {
  const icons = {
    Users,
    Star,
    MapPin,
    Calendar,
  };
  return icons[iconName as keyof typeof icons] || Users;
};

const StatisticsBlock: React.FC<StatisticsBlockProps> = ({ block }) => {
  const content = block.content as StatisticsBlockContent;

  const columns = block.layout_settings.columns || 4;
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
      {content.section_title && (
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {content.section_title}
          </h2>
        </div>
      )}

      <div className={`grid ${gridClasses[columns as keyof typeof gridClasses]} ${gapClasses[gap as keyof typeof gapClasses]}`}>
        {content.stats.map((stat, index) => {
          const IconComponent = stat.icon ? getIconComponent(stat.icon) : null;

          return (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 space-y-4">
                {IconComponent && (
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    {stat.number}
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {stat.label}
                  </div>
                  {stat.description && (
                    <div className="text-sm text-muted-foreground">
                      {stat.description}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StatisticsBlock;