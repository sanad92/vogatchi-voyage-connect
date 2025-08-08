import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePageBlocks } from "@/hooks/cms/usePageBlocks";
import BlockRenderer from "@/components/cms/BlockRenderer";

const DynamicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { page, blocks, isLoading, error } = usePageBlocks(slug || "");

  useEffect(() => {
    if (!page) return;

    const title = page.seo_title || page.name || (slug ? slug.toString() : "Page");
    const description = page.seo_description || page.description || "";
    const keywords = (page.seo_keywords || []).join(", ");
    const canonicalHref = `${window.location.origin}/p/${page.slug}`;

    document.title = title;

    const ensureMeta = (selector: string, create: () => HTMLElement) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };

    const metaDesc = ensureMeta('meta[name="description"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      return m;
    }) as HTMLMetaElement;
    metaDesc.setAttribute("content", description);

    const metaKeywords = ensureMeta('meta[name="keywords"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "keywords");
      return m;
    }) as HTMLMetaElement;
    metaKeywords.setAttribute("content", keywords);

    const canonical = ensureMeta('link[rel="canonical"]', () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    }) as HTMLLinkElement;
    canonical.setAttribute("href", canonicalHref);

    const ogTitle = ensureMeta('meta[property="og:title"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:title");
      return m;
    }) as HTMLMetaElement;
    ogTitle.setAttribute("content", title);

    const ogDesc = ensureMeta('meta[property="og:description"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:description");
      return m;
    }) as HTMLMetaElement;
    ogDesc.setAttribute("content", description);

    const ogUrl = ensureMeta('meta[property="og:url"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:url");
      return m;
    }) as HTMLMetaElement;
    ogUrl.setAttribute("content", canonicalHref);

    if ((page as any).og_image_url) {
      const ogImage = ensureMeta('meta[property="og:image"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:image");
        return m;
      }) as HTMLMetaElement;
      ogImage.setAttribute("content", (page as any).og_image_url);
    }
  }, [page, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        حدث خطأ أثناء تحميل الصفحة
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        الصفحة غير موجودة
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
