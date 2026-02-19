import React from 'react';
import DOMPurify from 'dompurify';
import { BlockData, CustomTextBlockContent } from '@/types/blocks';

interface CustomTextBlockProps {
  block: BlockData;
}

const CustomTextBlock: React.FC<CustomTextBlockProps> = ({ block }) => {
  const content = block.content as CustomTextBlockContent;

  const getHeadingComponent = () => {
    const headingClasses = "font-bold text-foreground mb-4";
    const level = content.heading_level || 2;
    
    const headingSizes = {
      1: "text-4xl md:text-5xl",
      2: "text-3xl md:text-4xl",
      3: "text-2xl md:text-3xl",
      4: "text-xl md:text-2xl",
      5: "text-lg md:text-xl",
      6: "text-base md:text-lg",
    };

    const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
    const sizeClass = headingSizes[level as keyof typeof headingSizes];

    return (
      <HeadingTag className={`${headingClasses} ${sizeClass}`}>
        {block.title}
      </HeadingTag>
    );
  };

  return (
    <div className="prose prose-lg max-w-none">
      {block.title && getHeadingComponent()}
      <div 
        className="text-muted-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.content || '') }}
      />
    </div>
  );
};

export default CustomTextBlock;
