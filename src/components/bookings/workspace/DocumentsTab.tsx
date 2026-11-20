import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  IdCard,
  Plane,
  Ticket,
  Receipt,
  CheckSquare,
  Upload,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { DocumentsPanel } from '@/components/documents/DocumentsPanel';
import { bookingVoucherState } from '@/lib/bookingVoucher';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { BookingDocumentActions } from './BookingDocumentActions';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
}

type CategoryKey = 'identity' | 'tickets' | 'vouchers' | 'invoices' | 'confirmations' | 'other';

interface DocItem {
  id: string;
  name: string;
  date?: string;
  url?: string;
  category: CategoryKey;
  meta?: string;
}

const CATEGORY_META: Record<CategoryKey, { label: string; icon: any }> = {
  identity: { label: 'الهوية والتأشيرات', icon: IdCard },
  tickets: { label: 'التذاكر', icon: Plane },
  vouchers: { label: 'الفاوتشرات', icon: Ticket },
  invoices: { label: 'الفواتير', icon: Receipt },
  confirmations: { label: 'التأكيدات', icon: CheckSquare },
  other: { label: 'مستندات أخرى', icon: FileText },
};

const inferCategory = (docType?: string, fileName?: string): CategoryKey => {
  const s = `${docType || ''} ${fileName || ''}`.toLowerCase();
  if (/passport|visa|جواز|تأشير/.test(s)) return 'identity';
  if (/ticket|boarding|تذكر/.test(s)) return 'tickets';
  if (/voucher|فاوتش/.test(s)) return 'vouchers';
  if (/invoice|فاتور/.test(s)) return 'invoices';
  if (/confirm|تأكيد|reservation/.test(s)) return 'confirmations';
  return 'other';
};

export const DocumentsTab = ({ workspace }: Props) => {
  const navigate = useNavigate();
  const bookingId = workspace.booking?.id;
  const organizationId = workspace.booking?.organization_id;
  const { hasPermission } = usePermissionCheck();
  const customer = workspace.customer;
  const bookingPassports = useQuery({
    queryKey: ['wa-booking-passports', organizationId, bookingId],
    enabled: !!bookingId && !!organizationId && hasPermission('bookings_view')
      && hasPermission('documents_view') && hasPermission('whatsapp_view'),
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_passport_reviews')
        .select('message_id, full_name, nationality, expiry_date')
        .eq('booking_id', bookingId!).eq('organization_id', organizationId!).order('approved_at');
      if (error) throw error;
      return data;
    },
  });
  const voucherState = bookingVoucherState(workspace.booking);

  const generatedDocsQ = useQuery({
    queryKey: ['workspace-generated-docs', bookingId, voucherState],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_documents')
        .select('id, document_type, file_path, created_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      // Short-lived links minted per view; nothing long-lived is stored.
      const paths = rows.filter((row) => row.document_type !== 'voucher')
        .flatMap((row) => row.file_path ? [row.file_path] : []);
      if (!paths.length) return rows;
      const { data: signed } = await supabase.storage.from('documents').createSignedUrls(paths, 600);
      const byPath = new Map((signed ?? []).map((s: any) => [s.path, s.signedUrl]));
      return rows.map((r) => ({ ...r, file_url: r.file_path ? byPath.get(r.file_path) ?? null : null }));
    },
  });

  const grouped = useMemo(() => {
    const groups: Record<CategoryKey, DocItem[]> = {
      identity: [],
      tickets: [],
      vouchers: [],
      invoices: [],
      confirmations: [],
      other: [],
    };

    // 1) Invoices
    for (const inv of workspace.invoices as any[]) {
      groups.invoices.push({
        id: `inv-${inv.id}`,
        name: `فاتورة ${inv.invoice_number || inv.id.slice(0, 8)}`,
        date: inv.created_at,
        meta: `${Number(inv.final_amount ?? inv.total_amount ?? 0).toLocaleString()} ${inv.currency || ''}`,
        category: 'invoices',
      });
    }

    // 2) Generated documents from generated_documents table
    for (const d of (generatedDocsQ.data ?? []) as any[]) {
      const cat = inferCategory(d.document_type);
      groups[cat].push({
        id: `gen-${d.id}`,
        name: d.document_type || 'مستند',
        date: d.created_at,
        url: cat === 'vouchers' && voucherState !== 'current' ? undefined : d.file_url,
        meta: cat === 'vouchers' && voucherState !== 'current' ? 'فاوتشر مؤرشف' : undefined,
        category: cat,
      });
    }

    // 3) Customer identity (passport/visa) from customer record
    if (customer?.passport_number) {
      groups.identity.push({
        id: `cust-passport`,
        name: `جواز سفر: ${customer.passport_number}`,
        meta: customer.passport_expiry ? `صالح حتى ${customer.passport_expiry}` : undefined,
        category: 'identity',
      });
    }
    if ((customer as any)?.visa_number) {
      groups.identity.push({
        id: `cust-visa`,
        name: `تأشيرة: ${(customer as any).visa_number}`,
        category: 'identity',
      });
    }

    // 4) Booking attachments (if any)
    const attachments = (workspace.booking as any)?.attachments;
    if (Array.isArray(attachments)) {
      for (const a of attachments) {
        const cat = inferCategory(a.type, a.name || a.file_name);
        groups[cat].push({
          id: `att-${a.id || a.url}`,
          name: a.name || a.file_name || 'مرفق',
          date: a.created_at,
          url: a.url || a.file_url,
          category: cat,
        });
      }
    }

    for (const passport of bookingPassports.data ?? []) {
      groups.identity.push({
        id: `wa-passport-${passport.message_id}`,
        name: passport.full_name,
        meta: `جواز معتمد من واتساب · ${passport.nationality} · صالح حتى ${passport.expiry_date}`,
        category: 'identity',
      });
    }

    return groups;
  }, [workspace.invoices, workspace.booking, customer, generatedDocsQ.data, bookingPassports.data, voucherState]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          مركز المستندات الموحّد للحجز
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/new?booking_id=${bookingId}`)}>
            <Receipt className="h-4 w-4 ml-1" /> فاتورة جديدة
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/documents')}>
            <Upload className="h-4 w-4 ml-1" /> مكتبة المستندات
          </Button>
        </div>
      </div>

      <BookingDocumentActions workspace={workspace} />

      {bookingPassports.isError && <p role="alert" className="text-sm text-destructive">تعذّر تحميل مسافري واتساب المرتبطين بهذا الحجز.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(CATEGORY_META) as CategoryKey[]).map((key) => {
          const meta = CATEGORY_META[key];
          const items = grouped[key];
          const Icon = meta.icon;
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {meta.label}
                  <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">لا توجد مستندات في هذا القسم.</p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate" dir="auto">{it.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {it.meta || (it.date ? new Date(it.date).toLocaleDateString('ar-EG') : '')}
                          </p>
                        </div>
                        {it.url && (
                          <Button asChild variant="ghost" size="sm">
                            <a href={it.url} target="_blank" rel="noreferrer">
                              فتح <ExternalLink className="h-3 w-3 mr-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sprint 10.3 — Unified upload/manage for this booking */}
      <DocumentsPanel
        title="مستندات محمّلة"
        bookingId={bookingId}
        defaultCategory="voucher"
      />
    </div>
  );
};
