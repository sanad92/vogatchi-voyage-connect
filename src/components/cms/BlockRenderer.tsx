
import React from "react";
import type { BlockData } from "@/types/blocks";
import HeroBlock from "./blocks/HeroBlock";
import ServicesBlock from "./blocks/ServicesBlock";
import ImageGalleryBlock from "./blocks/ImageGalleryBlock";
import StatisticsBlock from "./blocks/StatisticsBlock";
import CustomTextBlock from "./blocks/CustomTextBlock";

interface Props {
  blocks: BlockData[];
}

const BlockRenderer: React.FC<Props> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block) => {
        const key = block.id || `${block.type}-${block.order_index}`;
        switch (block.type) {
          case "hero":
            return <HeroBlock key={key} block={block} />;
          case "services":
            return <ServicesBlock key={key} block={block} />;
          case "image_gallery":
            return <ImageGalleryBlock key={key} block={block} />;
          case "statistics":
            return <StatisticsBlock key={key} block={block} />;
          case "custom_text":
          default:
            return <CustomTextBlock key={key} block={block} />;
        }
      })}
    </>
  );
};

export default BlockRenderer;

