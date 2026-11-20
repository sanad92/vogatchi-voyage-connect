-- Keep the document identifier in the audit trail after its source row is gone.
ALTER TABLE public.document_audit_log
  DROP CONSTRAINT IF EXISTS document_audit_log_document_id_fkey;

DROP POLICY IF EXISTS "doc audit org read" ON public.document_audit_log;
DROP POLICY IF EXISTS "Read document activity with document or organization access" ON public.document_audit_log;
CREATE POLICY "Read document activity with document or organization access"
  ON public.document_audit_log FOR SELECT TO authenticated
  USING (
    public.is_platform_admin((SELECT auth.uid()))
    OR public.get_user_org_role((SELECT auth.uid()), organization_id) IN ('owner', 'admin', 'manager')
    OR EXISTS (
      SELECT 1 FROM public.documents AS doc
      WHERE doc.id = document_audit_log.document_id
        AND doc.organization_id = document_audit_log.organization_id
    )
  );

DROP POLICY IF EXISTS "doc audit org insert" ON public.document_audit_log;
DROP POLICY IF EXISTS "Record own client activity on visible documents" ON public.document_audit_log;
CREATE POLICY "Record own client activity on visible documents"
  ON public.document_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = (SELECT auth.uid())
    AND action IN ('uploaded', 'viewed', 'downloaded', 'updated')
    AND EXISTS (
      SELECT 1 FROM public.documents AS doc
      WHERE doc.id = document_audit_log.document_id
        AND doc.organization_id = document_audit_log.organization_id
    )
  );

CREATE OR REPLACE FUNCTION private.record_document_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.document_audit_log (document_id, organization_id, action, actor_id, metadata)
  VALUES (OLD.id, OLD.organization_id, 'deleted', auth.uid(), pg_catalog.jsonb_build_object(
    'category', OLD.category, 'version', OLD.version
  ));
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION private.record_document_deletion() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER record_document_deletion
  AFTER DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION private.record_document_deletion();

CREATE INDEX IF NOT EXISTS document_audit_deletions_by_org_idx
  ON public.document_audit_log (organization_id, created_at DESC)
  WHERE action = 'deleted';
