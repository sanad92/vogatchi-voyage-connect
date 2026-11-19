-- Legacy CMS rows remain drafts. Only explicit publications appear on public company routes.
DROP POLICY IF EXISTS "Public can view active pages" ON public.pages;
DROP POLICY IF EXISTS "Public can view active blocks of active pages" ON public.blocks;
REVOKE ALL ON public.pages, public.blocks FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages, public.blocks TO authenticated;

CREATE POLICY cms_pages_company_access ON public.pages AS RESTRICTIVE TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND public.has_org_permission(organization_id, 'admin_settings')))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND public.has_org_permission(organization_id, 'admin_settings')));

CREATE POLICY cms_blocks_company_access ON public.blocks AS RESTRICTIVE TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND public.has_org_permission(organization_id, 'admin_settings')
      AND EXISTS (SELECT FROM public.pages p WHERE p.id = blocks.page_id AND p.organization_id = blocks.organization_id)))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND public.has_org_permission(organization_id, 'admin_settings')
      AND EXISTS (SELECT FROM public.pages p WHERE p.id = blocks.page_id AND p.organization_id = blocks.organization_id)));

ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_slug_key;
DROP INDEX IF EXISTS public.idx_pages_slug;
CREATE UNIQUE INDEX cms_draft_company_slug_idx ON public.pages (organization_id, slug) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX cms_draft_legacy_slug_idx ON public.pages (slug) WHERE organization_id IS NULL;

CREATE TABLE public_intake_private.page_publications (
  page_id uuid PRIMARY KEY REFERENCES public.pages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public_intake_private.sites(organization_id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  sections jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  CHECK (jsonb_typeof(sections) = 'array')
);
ALTER TABLE public_intake_private.page_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public_intake_private.page_publications FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_company_publications(_org uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public_intake_private.can_manage_site(_org) THEN
    RAISE EXCEPTION 'Publications are restricted to organization administrators' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'slug', site.slug,
      'enabled', site.enabled AND coalesce(public.org_has_active_subscription(_org), false),
      'pages', coalesce((
        SELECT jsonb_agg(jsonb_build_object('pageId', entry.page_id, 'slug', entry.slug) ORDER BY entry.slug)
        FROM public_intake_private.page_publications AS entry WHERE entry.organization_id = _org
      ), '[]'::jsonb)
    )
    FROM public_intake_private.sites AS site WHERE site.organization_id = _org
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_company_publications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_publications(uuid) TO authenticated;

CREATE FUNCTION public.set_company_page_publication(_org uuid, _page uuid, _publish boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  page public.pages;
  site_enabled boolean;
  section_count bigint;
  oversized_section boolean;
  snapshot jsonb;
BEGIN
  IF NOT public_intake_private.can_manage_site(_org) THEN
    RAISE EXCEPTION 'Publications are restricted to organization administrators' USING ERRCODE = '42501';
  END IF;
  IF _publish IS NULL THEN
    RAISE EXCEPTION 'Missing publication action' USING ERRCODE = '22023';
  END IF;

  SELECT enabled INTO site_enabled FROM public_intake_private.sites WHERE organization_id = _org FOR UPDATE;
  IF NOT _publish THEN
    DELETE FROM public_intake_private.page_publications WHERE organization_id = _org AND page_id = _page;
    RETURN false;
  END IF;

  IF NOT coalesce(public.can_org_write(_org), false) THEN
    RAISE EXCEPTION 'This organization cannot publish' USING ERRCODE = '42501';
  END IF;
  IF NOT coalesce(site_enabled, false) THEN
    RAISE EXCEPTION 'The organization public site is disabled' USING ERRCODE = 'PT409';
  END IF;

  SELECT * INTO page FROM public.pages WHERE organization_id = _org AND id = _page FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found' USING ERRCODE = 'PT404';
  END IF;
  IF page.slug !~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'
    OR nullif(btrim(page.title), '') IS NULL OR length(page.title) > 140 OR length(page.description) > 3000 THEN
    RAISE EXCEPTION 'Invalid or oversized public page fields' USING ERRCODE = '22023';
  END IF;

  SELECT count(*), bool_or(length(block.title) > 140 OR length(block.body) > 3000),
    coalesce(jsonb_agg(jsonb_build_object(
      'title', nullif(left(btrim(block.title), 140), ''), 'text', left(btrim(block.body), 3000)
    ) ORDER BY block.order_index, block.id), '[]'::jsonb)
  INTO section_count, oversized_section, snapshot
  FROM (
    SELECT draft.id, draft.order_index, draft.title, draft.content->>'content' AS body
    FROM public.blocks AS draft
    WHERE draft.organization_id = _org AND draft.page_id = _page AND draft.is_active
      AND draft.type = 'custom_text' AND jsonb_typeof(draft.content->'content') = 'string'
      AND nullif(btrim(draft.content->>'content'), '') IS NOT NULL
    ORDER BY draft.order_index, draft.id
    LIMIT 31
  ) AS block;
  IF section_count > 30 OR coalesce(oversized_section, false) THEN
    RAISE EXCEPTION 'Public page has too much text' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public_intake_private.page_publications AS saved
    (page_id, organization_id, slug, title, description, sections)
  VALUES (_page, _org, page.slug, btrim(page.title), nullif(btrim(page.description), ''), snapshot)
  ON CONFLICT (page_id) DO UPDATE SET slug = excluded.slug, title = excluded.title,
    description = excluded.description, sections = excluded.sections, published_at = now()
  WHERE saved.organization_id = _org;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page publication conflicts with an existing entry' USING ERRCODE = 'PT409';
  END IF;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_company_page_publication(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_company_page_publication(uuid, uuid, boolean) TO authenticated;

CREATE FUNCTION public.get_public_cms_page(_company_slug text, _page_slug text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT jsonb_build_object('company', company.name, 'title', page.title, 'description', page.description,
    'sections', page.sections, 'acceptsBooking', site.accepts_booking_requests)
  FROM public_intake_private.sites AS site
  JOIN public.organizations AS company ON company.id = site.organization_id
  JOIN public_intake_private.page_publications AS page ON page.organization_id = site.organization_id
  WHERE site.slug = _company_slug AND page.slug = _page_slug AND site.enabled
    AND coalesce(public.org_has_active_subscription(site.organization_id), false);
$$;
REVOKE ALL ON FUNCTION public.get_public_cms_page(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_cms_page(text, text) TO anon, authenticated;
