
import React from "react";
import type { ServicesBlockContent, BlockData } from "@/types/blocks";
import { Button } from "@/components/ui/button";
import { getContainerClass, getSectionClasses } from "@/utils/cms/layout";
import * as Icons from "lucide-react";

interface Props {
  block: BlockData;
}

const ServicesBlock: React.FC<Props> = ({ block }) => {
  const content = (block.content || {}) as unknown as ServicesBlockContent;

  return (
    <section className={getSectionClasses(block.layout_settings)}>
      <div className={getContainerClass(block.layout_settings)}>
        <div className="space-y-2 mb-8">
          {content.section_title && (
            <h2 className="text-2xl md:text-3xl font-bold">{content.section_title}</h2>
          )}
          {content.section_description && (
            <p className="text-muted-foreground">{content.section_description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.services?.map((svc) => {
            const LucideIcon =
              (Icons as any)[svc.icon] || (Icons as any)["BadgeInfo"];
            return (
              <div key={svc.id} className="rounded-lg border p-6 bg-card space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <LucideIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">{svc.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{svc.description}</p>
                {svc.button_text && (
                  <Button size="sm" variant="outline">
                    {svc.button_text}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesBlock;

