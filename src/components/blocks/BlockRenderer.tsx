import React from 'react';
import { BlockData, BlockType } from '@/types/blocks';
import HeroBlock from './HeroBlock';
import ServicesBlock from './ServicesBlock';
import CitiesBlock from './CitiesBlock';
import HotelsBlock from './HotelsBlock';
import ContactBlock from './ContactBlock';
import DirectContractsBlock from './DirectContractsBlock';
import CustomTextBlock from './CustomTextBlock';
import ImageGalleryBlock from './ImageGalleryBlock';
import StatisticsBlock from './StatisticsBlock';
import { cn } from '@/lib/utils';

interface BlockRendererProps {
  block: BlockData;
  isEditing?: boolean;
  onEdit?: (block: BlockData) => void;
}

const BlockRenderer: React.FC<BlockRendererProps> = ({ 
  block, 
  isEditing = false, 
  onEdit 
}) => {
  const getContainerClasses = () => {
    const layout = block.layout_settings;
    const classes = [];

    // Container width
    switch (layout.container_width) {
      case 'full':
        classes.push('w-full');
        break;
      case 'narrow':
        classes.push('container mx-auto max-w-4xl');
        break;
      default:
        classes.push('container mx-auto');
    }

    // Padding Y
    switch (layout.padding_y) {
      case 'none':
        break;
      case 'sm':
        classes.push('py-8');
        break;
      case 'md':
        classes.push('py-12');
        break;
      case 'lg':
        classes.push('py-16');
        break;
      case 'xl':
        classes.push('py-24');
        break;
      default:
        classes.push('py-16');
    }

    // Padding X
    switch (layout.padding_x) {
      case 'none':
        break;
      case 'sm':
        classes.push('px-2');
        break;
      case 'md':
        classes.push('px-4');
        break;
      case 'lg':
        classes.push('px-6');
        break;
      case 'xl':
        classes.push('px-8');
        break;
      default:
        classes.push('px-4');
    }

    // Text alignment
    if (layout.text_align) {
      classes.push(`text-${layout.text_align}`);
    }

    return classes.join(' ');
  };

  const getBackgroundClasses = () => {
    const layout = block.layout_settings;
    const style = block.style_settings;
    const classes = [];

    if (layout.background_type === 'color' && style.background_color) {
      classes.push(style.background_color);
    } else if (layout.background_type === 'gradient') {
      classes.push('bg-gradient-to-br from-background via-background to-secondary/20');
    }

    return classes.join(' ');
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'hero':
        return <HeroBlock block={block} />;
      case 'services':
        return <ServicesBlock block={block} />;
      case 'cities':
        return <CitiesBlock block={block} />;
      case 'hotels':
        return <HotelsBlock block={block} />;
      case 'contact':
        return <ContactBlock block={block} />;
      case 'direct_contracts':
        return <DirectContractsBlock block={block} />;
      case 'custom_text':
        return <CustomTextBlock block={block} />;
      case 'image_gallery':
        return <ImageGalleryBlock block={block} />;
      case 'statistics':
        return <StatisticsBlock block={block} />;
      default:
        return <div className="text-muted-foreground">نوع البلوك غير مدعوم: {block.type}</div>;
    }
  };

  if (!block.is_active) {
    return null;
  }

  return (
    <section 
      className={cn(
        'relative',
        getBackgroundClasses(),
        isEditing && 'border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors'
      )}
      style={block.style_settings.custom_css ? { 
        ...(block.style_settings.custom_css as React.CSSProperties) 
      } : undefined}
    >
      {isEditing && onEdit && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => onEdit(block)}
            className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            تحرير
          </button>
        </div>
      )}
      <div className={getContainerClasses()}>
        {renderBlockContent()}
      </div>
    </section>
  );
};

export default BlockRenderer;