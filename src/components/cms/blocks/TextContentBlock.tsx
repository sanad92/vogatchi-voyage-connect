import React from "react";
import type { BlockData } from "@/types/blocks";

interface TextContentBlockContent {
  content: string;
  heading_level?: 1 | 2 | 3 | 4 | 5 | 6;
}

interface Props {
  block: BlockData;
}

const TextContentBlock: React.FC<Props> = ({ block }) => {
  const content = block.content as TextContentBlockContent;

  const getContainerClasses = () => {
    const { container_width, padding_y, text_align } = block.layout_settings;
    
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
    
    // Text alignment
    if (text_align === 'center') classes += "text-center ";
    else if (text_align === 'right') classes += "text-right ";
    else classes += "text-left ";
    
    return classes;
  };

  return (
    <section className="w-full">
      <div className={getContainerClasses()}>
        <div 
          className="prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      </div>
    </section>
  );
};

export default TextContentBlock;