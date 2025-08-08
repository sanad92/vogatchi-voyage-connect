
import React from "react";
import type { HeroBlockContent, BlockData } from "@/types/blocks";
import { Button } from "@/components/ui/button";
import { getContainerClass, getSectionClasses } from "@/utils/cms/layout";

interface Props {
  block: BlockData;
}

const HeroBlock: React.FC<Props> = ({ block }) => {
  const content = (block.content || {}) as unknown as HeroBlockContent;

  const bgImage = content.background_image
    ? {
        backgroundImage: `url(${content.background_image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <section
      className={`relative ${getSectionClasses(block.layout_settings)}`}
      style={bgImage}
    >
      {content.background_image && (
        <div className="absolute inset-0 bg-background/60" />
      )}
      <div className={`${getContainerClass(block.layout_settings)} relative z-10`}>
        <div className="max-w-3xl mx-auto space-y-4">
          {content.main_title && (
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              {content.main_title}
            </h1>
          )}
          {content.subtitle && (
            <p className="text-xl text-muted-foreground">{content.subtitle}</p>
          )}
          {content.description && (
            <p className="text-base md:text-lg text-muted-foreground">{content.description}</p>
          )}
          {(content.primary_button_text || content.secondary_button_text) && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {content.primary_button_text && (
                <Button size="lg" className="min-w-40">
                  {content.primary_button_text}
                </Button>
              )}
              {content.secondary_button_text && (
                <Button size="lg" variant="outline" className="min-w-40">
                  {content.secondary_button_text}
                </Button>
              )}
            </div>
          )}

          {Array.isArray(content.stats) && content.stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              {content.stats.map((s, idx) => (
                <div key={idx} className="rounded-lg border p-4 bg-card">
                  <div className="text-2xl font-bold">{s.number}</div>
                  <div className="text-muted-foreground text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroBlock;

