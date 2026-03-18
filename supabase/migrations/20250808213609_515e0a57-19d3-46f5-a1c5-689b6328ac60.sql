-- Pages and Blocks CMS schema
-- 1) Create pages table
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  og_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Create blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  style_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  section text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_blocks_page ON public.blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_blocks_page_order ON public.blocks(page_id, order_index);
CREATE INDEX IF NOT EXISTS idx_blocks_active ON public.blocks(is_active);

-- 4) RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Public read-only access to active content
DROP POLICY IF EXISTS "Public can view active pages" ON public.pages;
CREATE POLICY "Public can view active pages"
ON public.pages FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active blocks of active pages" ON public.blocks;
CREATE POLICY "Public can view active blocks of active pages"
ON public.blocks FOR SELECT
USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.pages p
    WHERE p.id = blocks.page_id AND p.is_active = true
  )
);

-- Admins/managers full management policies
DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages"
ON public.pages FOR ALL
USING (
  has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
)
WITH CHECK (
  has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
);

DROP POLICY IF EXISTS "Admins can manage blocks" ON public.blocks;
CREATE POLICY "Admins can manage blocks"
ON public.blocks FOR ALL
USING (
  has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
)
WITH CHECK (
  has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
);

-- 5) Updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_pages_updated_at'
  ) THEN
    CREATE TRIGGER set_pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_blocks_updated_at'
  ) THEN
    CREATE TRIGGER set_blocks_updated_at
    BEFORE UPDATE ON public.blocks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 6) Seed a default home page and example block
-- INSERT INTO public.pages (slug, name, description, is_active, seo_title, seo_description)
-- VALUES ('home', 'الصفحة الرئيسية', 'الصفحة الافتراضية', true, 'الصفحة الرئيسية', 'مرحبا بكم')
-- ON CONFLICT (slug) DO NOTHING;

-- Example hero block (only if page exists and no blocks yet)
-- INSERT INTO public.blocks (page_id, type, title, order_index, is_active, content, layout_settings)
-- SELECT p.id, 'hero', 'Hero', 0, true,
--   jsonb_build_object(
--     'main_title','مرحبا بكم في موقعنا',
--     'subtitle','محتوى ديناميكي عبر لوحة التحكم',
--     'description','يمكنك تعديل هذا القسم من لوحة التحكم',
--     'primary_button_text','ابدا الآن'
--   ),
--   jsonb_build_object('container_width','container','padding_y','xl','text_align','center')
-- FROM public.pages p
-- WHERE p.slug = 'home'
-- AND NOT EXISTS (
--   SELECT 1 FROM public.blocks b WHERE b.page_id = p.id
-- );
