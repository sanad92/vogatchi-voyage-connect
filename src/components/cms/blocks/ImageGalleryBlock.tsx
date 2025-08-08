
import React from "react";
import type { ImageGalleryBlockContent, BlockData } from "@/types/blocks";
import { getContainerClass, getSectionClasses } from "@/utils/cms/layout";

interface Props {
  block: BlockData;
}

const ImageGalleryBlock: React.FC<Props> = ({ block }) => {
  const content = (block.content || {}) as unknown as ImageGalleryBlockContent;

  return (
    <section className={getSectionClasses(block.layout_settings)}>
      <div className={getContainerClass(block.layout_settings)}>
        {content.section_title && (
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{content.section_title}</h2>
        )}
        <div
          className={
            content.layout === "carousel"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : content.layout === "masonry"
              ? "columns-1 sm:columns-2 lg:columns-3 gap-4"
              : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          }
        >
          {content.images?.map((img, idx) => (
            <figure key={idx} className="break-inside-avoid">
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-auto rounded-md border object-cover"
              />
              {img.caption && (
                <figcaption className="text-xs text-muted-foreground mt-1">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImageGalleryBlock;

