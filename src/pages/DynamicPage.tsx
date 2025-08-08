import React from "react";
import { useParams } from "react-router-dom";
import { usePageBlocks } from "@/hooks/cms/usePageBlocks";
import BlockRenderer from "@/components/cms/BlockRenderer";

const DynamicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { blocks, isLoading } = usePageBlocks(slug || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <BlockRenderer blocks={blocks} />
    </main>
  );
};

export default DynamicPage;
