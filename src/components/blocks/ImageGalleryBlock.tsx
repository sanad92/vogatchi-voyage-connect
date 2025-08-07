import React from 'react';
import { BlockData, ImageGalleryBlockContent } from '@/types/blocks';

interface ImageGalleryBlockProps {
  block: BlockData;
}

const ImageGalleryBlock: React.FC<ImageGalleryBlockProps> = ({ block }) => {
  const content = block.content as ImageGalleryBlockContent;

  const getLayoutClasses = () => {
    const columns = block.layout_settings.columns || 3;
    const gap = block.layout_settings.grid_gap || 'md';
    
    const gridClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };
    
    const gapClasses = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    if (content.layout === 'carousel') {
      return 'flex overflow-x-auto space-x-4 pb-4';
    }
    
    if (content.layout === 'masonry') {
      return `columns-1 md:columns-2 lg:columns-${columns} ${gapClasses[gap as keyof typeof gapClasses]}`;
    }

    return `grid ${gridClasses[columns as keyof typeof gridClasses]} ${gapClasses[gap as keyof typeof gapClasses]}`;
  };

  return (
    <div className="space-y-8">
      {content.section_title && (
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {content.section_title}
          </h2>
        </div>
      )}

      <div className={getLayoutClasses()}>
        {content.images.map((image, index) => (
          <div 
            key={index} 
            className={`
              relative group overflow-hidden rounded-lg
              ${content.layout === 'carousel' ? 'flex-shrink-0 w-80' : ''}
              ${content.layout === 'masonry' ? 'break-inside-avoid mb-4' : ''}
            `}
          >
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-sm">{image.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGalleryBlock;