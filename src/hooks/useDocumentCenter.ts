import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export type DocumentCategory =
  | 'passport'
  | 'visa'
  | 'voucher'
  | 'invoice'
  | 'purchase_order'
  | 'ticket'
  | 'insurance'
  | 'contract'
  | 'other';

export interface DocumentRow {
  id: string;
  organization_id: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  tags: string[];
  customer_id: string | null;
  booking_id: string | null;
  supplier_id: string | null;
  expiry_date: string | null;
  version: number;
  parent_document_id: string | null;
  metadata: Record<string, any>;
  is_confidential: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentFilter {
  category?: DocumentCategory | 'all';
  search?: string;
  customerId?: string;
  bookingId?: string;
  supplierId?: string;
  tag?: string;
  expiringWithinDays?: number;
}

const CATEGORY_LABELS_AR: Record<DocumentCategory, string> = {
  passport: 'جواز سفر',
  visa: 'تأشيرة',
  voucher: 'فاوتشر',
  invoice: 'فاتورة',
  purchase_order: 'أمر شراء',
  ticket: 'تذكرة',
  insurance: 'تأمين',
  contract: 'عقد',
  other: 'أخرى',
};

export const documentCategoryLabel = (c: DocumentCategory) => CATEGORY_LABELS_AR[c] ?? c;
export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'passport', 'visa', 'voucher', 'invoice', 'purchase_order',
  'ticket', 'insurance', 'contract', 'other',
];

async function logAudit(input: {
  documentId?: string | null;
  organizationId: string;
  action: string;
  metadata?: Record<string, any>;
}) {
  const { data: u } = await supabase.auth.getUser();
  await (supabase as any).from('document_audit_log').insert({
    document_id: input.documentId ?? null,
    organization_id: input.organizationId,
    action: input.action,
    actor_id: u.user?.id ?? null,
    metadata: input.metadata ?? {},
  });
}

export function useDocumentCenter(filter: DocumentFilter = {}) {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['doc-center', orgId, filter],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('documents')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filter.category && filter.category !== 'all') q = q.eq('category', filter.category);
      if (filter.customerId) q = q.eq('customer_id', filter.customerId);
      if (filter.bookingId) q = q.eq('booking_id', filter.bookingId);
      if (filter.supplierId) q = q.eq('supplier_id', filter.supplierId);
      if (filter.tag) q = q.contains('tags', [filter.tag]);
      if (filter.search) q = q.ilike('title', `%${filter.search}%`);
      if (filter.expiringWithinDays) {
        const until = new Date(Date.now() + filter.expiringWithinDays * 86400000)
          .toISOString().slice(0, 10);
        q = q.lte('expiry_date', until).not('expiry_date', 'is', null);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });

  const upload = useMutation({
    mutationFn: async (input: {
      file: File;
      category: DocumentCategory;
      title?: string;
      description?: string;
      tags?: string[];
      customerId?: string | null;
      bookingId?: string | null;
      supplierId?: string | null;
      expiryDate?: string | null;
      isConfidential?: boolean;
    }) => {
      if (!orgId) throw new Error('No organization');
      const { data: u } = await supabase.auth.getUser();
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const ts = Date.now();
      const path = `${orgId}/uploads/${input.category}/${ts}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(path, input.file, { contentType: input.file.type, upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await (supabase as any)
        .from('documents')
        .insert({
          organization_id: orgId,
          category: input.category,
          title: input.title || input.file.name,
          description: input.description ?? null,
          file_path: path,
          file_name: input.file.name,
          file_size: input.file.size,
          mime_type: input.file.type,
          tags: input.tags ?? [],
          customer_id: input.customerId ?? null,
          booking_id: input.bookingId ?? null,
          supplier_id: input.supplierId ?? null,
          expiry_date: input.expiryDate ?? null,
          is_confidential: input.isConfidential ?? false,
          uploaded_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      await logAudit({
        documentId: data.id,
        organizationId: orgId,
        action: 'uploaded',
        metadata: { size: input.file.size, mime: input.file.type },
      });
      return data as DocumentRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-center', orgId] });
      qc.invalidateQueries({ queryKey: ['doc-center-scope'] });
      toast.success('تم رفع المستند');
    },
    onError: (e: any) => toast.error(e.message || 'فشل رفع المستند'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const doc = listQuery.data?.find((d) => d.id === id);
      if (doc?.file_path) {
        await supabase.storage.from('documents').remove([doc.file_path]);
      }
      const { error } = await (supabase as any).from('documents').delete().eq('id', id);
      if (error) throw error;
      if (orgId) await logAudit({ documentId: id, organizationId: orgId, action: 'deleted' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-center', orgId] });
      qc.invalidateQueries({ queryKey: ['doc-center-scope'] });
      toast.success('تم الحذف');
    },
    onError: (e: any) => toast.error(e.message || 'فشل الحذف'),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<DocumentRow> }) => {
      const { error } = await (supabase as any)
        .from('documents')
        .update(input.patch)
        .eq('id', input.id);
      if (error) throw error;
      if (orgId) await logAudit({
        documentId: input.id, organizationId: orgId, action: 'updated',
        metadata: { fields: Object.keys(input.patch) },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-center', orgId] }),
  });

  const getSignedUrl = async (filePath: string, docId?: string) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    if (orgId && docId) {
      await logAudit({ documentId: docId, organizationId: orgId, action: 'viewed' });
    }
    return data.signedUrl;
  };

  const download = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage.from('documents').download(doc.file_path);
    if (error) { toast.error('فشل التحميل'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = doc.file_name; a.click();
    URL.revokeObjectURL(url);
    if (orgId) await logAudit({ documentId: doc.id, organizationId: orgId, action: 'downloaded' });
  };

  const stats = useMemo(() => {
    const rows = listQuery.data ?? [];
    const now = Date.now();
    const soon = now + 30 * 86400000;
    return {
      total: rows.length,
      expiringSoon: rows.filter(
        (d) => d.expiry_date && new Date(d.expiry_date).getTime() <= soon,
      ).length,
      expired: rows.filter(
        (d) => d.expiry_date && new Date(d.expiry_date).getTime() < now,
      ).length,
      byCategory: DOCUMENT_CATEGORIES.reduce(
        (acc, c) => ({ ...acc, [c]: rows.filter((d) => d.category === c).length }),
        {} as Record<DocumentCategory, number>,
      ),
    };
  }, [listQuery.data]);

  return {
    documents: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    refetch: listQuery.refetch,
    upload, remove, update,
    getSignedUrl, download,
    stats,
  };
}

export function useDocumentAudit(documentId?: string) {
  return useQuery({
    queryKey: ['doc-audit', documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('document_audit_log')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}
