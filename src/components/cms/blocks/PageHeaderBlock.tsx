import React from "react";
import type { BlockData } from "@/types/blocks";

interface PageHeaderBlockContent {
  main_title: string;
  subtitle?: string;
  description?: string;
  show_breadcrumb?: boolean;
}

interface Props {
  block: BlockData;
}

const PageHeaderBlock: React.FC<Props> = ({ block }) => {
  const content = block.content as PageHeaderBlockContent;

  const getContainerClasses = () => {
    const { container_width, padding_y, text_align, background_type } = block.layout_settings;
    
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

  const getBackgroundClasses = () => {
    const { background_type } = block.layout_settings;
    const { background_color } = block.style_settings;
    
    if (background_type === 'gradient' && background_color) {
      return `bg-gradient-to-r ${background_color}`;
    } else if (background_type === 'color' && background_color) {
      return background_color;
    }
    return "";
  };

  return (
    <section className={`${getBackgroundClasses()}`}>
      <div className={getContainerClasses()}>
        <div className="space-y-4">
          {content.show_breadcrumb && (
            <nav className="text-sm text-muted-foreground">
              <span>الرئيسية</span> / <span className="text-foreground">{content.main_title}</span>
            </nav>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            {content.main_title}
          </h1>
          {content.subtitle && (
            <p className="text-xl text-muted-foreground">
              {content.subtitle}
            </p>
          )}
          {content.description && (
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {content.description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PageHeaderBlock;