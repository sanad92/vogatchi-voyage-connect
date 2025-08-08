
import React from "react";
import type { CustomTextBlockContent, BlockData } from "@/types/blocks";
import { getContainerClass, getSectionClasses } from "@/utils/cms/layout";

interface Props {
  block: BlockData;
}

const CustomTextBlock: React.FC<Props> = ({ block }) => {
  const content = (block.content || {}) as unknown as CustomTextBlockContent;

  const HeadingTag = `h${content.heading_level || 2}` as keyof JSX.IntrinsicElements;

  return (
    <section className={getSectionClasses(block.layout_settings)}>
      <div className={getContainerClass(block.layout_settings)}>
        {content.heading_level && (
          <HeadingTag className="text-2xl md:text-3xl font-bold mb-3">
            {/* Optional heading could be part of content if desired */}
          </HeadingTag>
        )}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      </div>
    </section>
  );
};

export default CustomTextBlock;

