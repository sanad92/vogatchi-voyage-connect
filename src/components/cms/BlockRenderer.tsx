
import React from "react";
import type { BlockData } from "@/types/blocks";
import HeroBlock from "./blocks/HeroBlock";
import ServicesBlock from "./blocks/ServicesBlock";
import ImageGalleryBlock from "./blocks/ImageGalleryBlock";
import StatisticsBlock from "./blocks/StatisticsBlock";
import CustomTextBlock from "./blocks/CustomTextBlock";
import PageHeaderBlock from "./blocks/PageHeaderBlock";
import AuthFormBlock from "./blocks/AuthFormBlock";
import TextContentBlock from "./blocks/TextContentBlock";
import FeatureListBlock from "./blocks/FeatureListBlock";
import BookingFormBlock from "./blocks/BookingFormBlock";

// Lazy load new blocks
const CompanyInfoBlock = React.lazy(() => import("./blocks/CompanyInfoBlock"));
const ContactFormBlock = React.lazy(() => import("./blocks/ContactFormBlock"));
const AboutUsBlock = React.lazy(() => import("./blocks/AboutUsBlock"));

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
          case "page_header":
            return <PageHeaderBlock key={key} block={block} />;
          case "auth_form":
            return <AuthFormBlock key={key} block={block} />;
          case "text_content":
            return <TextContentBlock key={key} block={block} />;
          case "feature_list":
            return <FeatureListBlock key={key} block={block} />;
          case "booking_form":
            return <BookingFormBlock key={key} block={block} />;
          case "company_info":
            return (
              <React.Suspense key={key} fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
                <CompanyInfoBlock block={block} />
              </React.Suspense>
            );
          case "contact_form":
            return (
              <React.Suspense key={key} fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
                <ContactFormBlock block={block} />
              </React.Suspense>
            );
          case "about_us":
            return (
              <React.Suspense key={key} fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
                <AboutUsBlock block={block} />
              </React.Suspense>
            );
          case "contact":
            return <CustomTextBlock key={key} block={block} />;
          case "custom_text":
          default:
            return <CustomTextBlock key={key} block={block} />;
        }
      })}
    </>
  );
};

export default BlockRenderer;

