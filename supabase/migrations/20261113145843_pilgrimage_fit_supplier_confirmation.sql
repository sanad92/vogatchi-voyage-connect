CREATE TABLE public.pilgrimage_fit_supplier_confirmations (
  item_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  reference text NOT NULL CHECK (char_length(btrim(reference)) BETWEEN 2 AND 120),
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, item_id) REFERENCES public.pilgrimage_sale_items(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, sale_id) REFERENCES public.pilgrimage_sales(organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX pilgrimage_fit_confirmation_sale_idx
  ON public.pilgrimage_fit_supplier_confirmations (organization_id, sale_id);

ALTER TABLE public.pilgrimage_fit_supplier_confirmations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilgrimage_fit_supplier_confirmations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pilgrimage_fit_supplier_confirmations TO authenticated;
CREATE POLICY "Company members read FIT confirmations"
  ON public.pilgrimage_fit_supplier_confirmations FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE FUNCTION public.record_pilgrimage_fit_supplier_confirmation(
  _sale_id uuid, _item_id uuid, _supplier_id uuid, _reference text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  sale public.pilgrimage_sales%ROWTYPE;
  confirmation public.pilgrimage_fit_supplier_confirmations%ROWTYPE;
  reference text := nullif(btrim(_reference), '');
BEGIN
  SELECT * INTO sale FROM public.pilgrimage_sales
  WHERE id = _sale_id AND public.user_belongs_to_org(actor, organization_id)
  FOR UPDATE;
  IF actor IS NULL OR NOT FOUND
    OR NOT coalesce(public.can_org_write(sale.organization_id), false)
    OR coalesce(public.get_user_org_role(actor, sale.organization_id)::text, '') NOT IN ('owner', 'admin', 'manager') THEN
    RAISE EXCEPTION 'fit_confirmation_permission_denied' USING ERRCODE = '42501';
  END IF;
  IF sale.sale_model <> 'fit' OR sale.status <> 'quoted' OR reference IS NULL OR char_length(reference) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'fit_confirmation_requires_issued_quote_and_reference' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.pilgrimage_sale_items
    WHERE id = _item_id AND sale_id = sale.id AND organization_id = sale.organization_id
  ) THEN
    RAISE EXCEPTION 'fit_confirmation_item_not_found' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO confirmation FROM public.pilgrimage_fit_supplier_confirmations WHERE item_id = _item_id;
  IF FOUND THEN
    IF confirmation.supplier_id = _supplier_id AND confirmation.reference = reference THEN
      RETURN confirmation.item_id;
    END IF;
    RAISE EXCEPTION 'fit_confirmation_already_recorded' USING ERRCODE = '23505';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.suppliers WHERE id = _supplier_id AND organization_id = sale.organization_id AND is_active
  ) THEN
    RAISE EXCEPTION 'fit_confirmation_supplier_not_found' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.pilgrimage_fit_supplier_confirmations
    (item_id, organization_id, sale_id, supplier_id, reference, recorded_by)
  VALUES (_item_id, sale.organization_id, sale.id, _supplier_id, reference, actor);
  RETURN _item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_pilgrimage_fit_supplier_confirmation(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_pilgrimage_fit_supplier_confirmation(uuid, uuid, uuid, text) TO authenticated;
