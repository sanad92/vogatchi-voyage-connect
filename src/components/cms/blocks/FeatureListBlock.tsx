import React from "react";
import type { BlockData } from "@/types/blocks";
import { Award, DollarSign, Headphones, Shield, Star, CheckCircle } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface FeatureListBlockContent {
  features: Feature[];
}

interface Props {
  block: BlockData;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  award: Award,
  'dollar-sign': DollarSign,
  headphones: Headphones,
  shield: Shield,
  star: Star,
  'check-circle': CheckCircle,
};

const FeatureListBlock: React.FC<Props> = ({ block }) => {
  const content = block.content as FeatureListBlockContent;

  const getContainerClasses = () => {
    const { container_width, padding_y, columns, grid_gap } = block.layout_settings;
    
    let classes = "w-full ";
    
    // Container width
    if (container_width === 'full') classes += "w-full ";
    else if (container_width === 'narrow') classes += "max-w-4xl mx-auto px-4 ";
    else classes += "container mx-auto px-4 ";
    
    // Padding
    if (padding_y === 'none') classes += "py-0 ";
    else if (padding_y === 'sm') classes += "py-8 ";
    else if (padding_y === 'md') classes += "py-12 ";
    else if (padding_y === 'lg') classes += "py-16 ";
    else if (padding_y === 'xl') classes += "py-24 ";
    else classes += "py-16 ";
    
    return classes;
  };

  const getGridClasses = () => {
    const { columns, grid_gap } = block.layout_settings;
    
    let classes = "grid ";
    
    // Columns
    if (columns === 1) classes += "grid-cols-1 ";
    else if (columns === 2) classes += "grid-cols-1 md:grid-cols-2 ";
    else if (columns === 3) classes += "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ";
    else if (columns === 4) classes += "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ";
    else classes += "grid-cols-1 md:grid-cols-2 ";
    
    // Grid gap
    if (grid_gap === 'sm') classes += "gap-4 ";
    else if (grid_gap === 'md') classes += "gap-6 ";
    else if (grid_gap === 'lg') classes += "gap-8 ";
    else if (grid_gap === 'xl') classes += "gap-12 ";
    else classes += "gap-8 ";
    
    return classes;
  };

  return (
    <section className="w-full">
      <div className={getContainerClasses()}>
        <div className={getGridClasses()}>
          {content.features.map((feature, index) => {
            const IconComponent = iconMap[feature.icon] || Award;
            
            return (
              <div 
                key={index}
                className="p-6 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex items-start space-x-4 space-x-reverse">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureListBlock;