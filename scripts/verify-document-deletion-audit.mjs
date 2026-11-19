import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/20261119232038_retain_document_deletion_audit.sql', import.meta.url), 'utf8');
const db = new PGlite();
const id = (suffix) => `00000000-0000-0000-0000-000000000${suffix}`;
const ownOrg = id(201);
const otherOrg = id(202);
const doc = id(101);
const actor = id(301);
try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('test.actor', true), '')::uuid;
    $$;
    CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false; $$;
    CREATE FUNCTION public.get_user_org_role(uuid, uuid) RETURNS text LANGUAGE sql AS $$
      SELECT CASE WHEN $1 = auth.uid() AND $2 = current_setting('test.org', true)::uuid
        THEN current_setting('test.role', true) END;
    $$;
    CREATE TABLE public.documents (
      id uuid PRIMARY KEY, organization_id uuid, category text, version int, title text
    );
    CREATE TABLE public.document_audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid REFERENCES public.documents ON DELETE CASCADE,
      organization_id uuid, action text, actor_id uuid, metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "doc audit org read" ON public.document_audit_log FOR SELECT TO authenticated USING (true);
    CREATE POLICY "doc audit org insert" ON public.document_audit_log FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY visible_documents ON public.documents FOR SELECT TO authenticated
      USING (public.get_user_org_role(auth.uid(), organization_id) IS NOT NULL);
    CREATE POLICY removable_documents ON public.documents FOR DELETE TO authenticated
      USING (public.get_user_org_role(auth.uid(), organization_id) = 'owner');
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT SELECT, DELETE ON public.documents TO authenticated;
    GRANT SELECT, INSERT ON public.document_audit_log TO authenticated;
    INSERT INTO public.documents VALUES ('${doc}', '${ownOrg}', 'passport', 2, 'Personal document');
    INSERT INTO public.document_audit_log (document_id, organization_id, action)
      VALUES ('${doc}', '${ownOrg}', 'uploaded');
  `);
  await db.exec(migration);
  const audit = () => db.query('SELECT document_id, organization_id, actor_id, action, metadata FROM public.document_audit_log ORDER BY action');
  const report = (action, loggedActor = actor, org = ownOrg) => db.query(
    'INSERT INTO public.document_audit_log (document_id, organization_id, action, actor_id) VALUES ($1, $2, $3, $4)',
    [doc, org, action, loggedActor],
  );

  await db.exec(`SET ROLE authenticated; SET test.actor = '${actor}'; SET test.org = '${ownOrg}'; SET test.role = 'owner';`);
  await report('viewed');
  await assert.rejects(report('deleted'), { code: '42501' });
  await assert.rejects(report('viewed', id(302)), { code: '42501' });
  await assert.rejects(report('viewed', actor, otherOrg), { code: '42501' });
  await db.exec('BEGIN;');
  await db.query('DELETE FROM public.documents WHERE id = $1', [doc]);
  assert.ok((await audit()).rows.some((row) => row.action === 'deleted'));
  await db.exec('ROLLBACK;');
  assert.deepEqual((await audit()).rows.map((row) => row.action), ['uploaded', 'viewed']);
  await db.query('DELETE FROM public.documents WHERE id = $1', [doc]);
  const { rows } = await audit();
  assert.deepEqual(rows.map((row) => row.action), ['deleted', 'uploaded', 'viewed']);
  assert.deepEqual(rows[0], {
    document_id: doc, organization_id: ownOrg, actor_id: actor, action: 'deleted', metadata: { category: 'passport', version: 2 },
  });

  await db.exec("SET test.role = 'member';");
  assert.equal((await audit()).rows.length, 0);
  await db.exec(`SET test.org = '${otherOrg}'; SET test.role = 'owner';`);
  assert.equal((await audit()).rows.length, 0);
  console.log('Document deletion audit is atomic, preserves event history, and enforces tenant visibility.');
} finally {
  await db.close();
}
