
import React from "react";
import type { StatisticsBlockContent, BlockData } from "@/types/blocks";
import { getContainerClass, getSectionClasses } from "@/utils/cms/layout";

interface Props {
  block: BlockData;
}

const StatisticsBlock: React.FC<Props> = ({ block }) => {
  const content = (block.content || {}) as unknown as StatisticsBlockContent;

  return (
    <section className={getSectionClasses(block.layout_settings)}>
      <div className={getContainerClass(block.layout_settings)}>
        {content.section_title && (
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{content.section_title}</h2>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {content.stats?.map((s, idx) => (
            <div key={idx} className="rounded-lg border p-4 bg-card text-center">
              <div className="text-2xl font-bold">{s.number}</div>
              <div className="text-muted-foreground text-sm">{s.label}</div>
              {s.description && (
                <div className="text-xs text-muted-foreground mt-1">{s.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatisticsBlock;

