import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Download, Loader2, Receipt } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { generateDocumentPDF, type DocumentData, type DocumentItem } from '@/utils/pdfGenerator';
import type { Workspace } from './types';

const anyClient = supabase as any;

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

interface Props {
  workspace: Workspace;
}

export const BookingDocumentActions = ({ workspace }: Props) => {
  const qc = useQueryClient();
  const booking: any = workspace.booking;
  const customer: any = workspace.customer;
  const { data: org } = useCurrentOrganization();
  const [busy, setBusy] = useState<string | null>(null);

  const vouchersQ = useQuery({
    queryKey: ['workspace-vouchers', booking?.id],
    enabled: !!booking?.id,
    queryFn: async () => {
      const { data } = await anyClient
        .from('booking_vouchers')
        .select('*')
        .eq('booking_id', booking.id)
        .order('issued_at', { ascending: false });
      return data ?? [];
    },
  });

  const companyBlock = {
    companyName: org?.name || 'Vogatchi Trips',
    companyLogo: org?.logo_url || undefined,
    companyPhone: org?.phone || undefined,
    companyEmail: org?.email || undefined,
    companyAddress: org?.address || undefined,
  };

  const buildVoucherData = (voucherNumber: string): DocumentData => {
    const items: DocumentItem[] = [
      {
        description:
          booking?.title ||
          booking?.description ||
          `${booking?.booking_type || 'حجز'} - ${booking?.destination || ''}`.trim(),
        quantity: 1,
        unitPrice: Number(booking?.selling_price ?? 0),
        total: Number(booking?.selling_price ?? 0),
      },
    ];
    const total = Number(booking?.selling_price ?? 0);
    return {
      documentType: 'voucher',
      documentNumber: voucherNumber,
      date: new Date().toISOString().split('T')[0],
      ...companyBlock,
      customerName: customer?.name || booking?.customer_name || 'عميل',
      customerEmail: customer?.email || undefined,
      customerPhone: customer?.phone || undefined,
      items,
      subtotal: total,
      totalAmount: total,
      paidAmount: workspace.financials.paid,
      remainingAmount: workspace.financials.outstanding,
      currency: booking?.currency || workspace.financials.currency,
      bookingReference: booking?.booking_number || booking?.id,
      travelDate: booking?.start_date || booking?.travel_date || undefined,
      returnDate: booking?.end_date || undefined,
      destination: booking?.destination || undefined,
    };
  };

  const buildInvoiceData = (inv: any): DocumentData => {
    const lineItems: DocumentItem[] = (inv.invoice_items ?? []).map((it: any) => ({
      description: it.description || it.item_name || 'بند',
      quantity: Number(it.quantity ?? 1),
      unitPrice: Number(it.unit_price ?? 0),
      total: Number(it.total_price ?? it.total ?? Number(it.unit_price ?? 0) * Number(it.quantity ?? 1)),
    }));
    const total = Number(inv.final_amount ?? inv.total_amount ?? 0);
    const items = lineItems.length
      ? lineItems
      : [
          {
            description: `حجز ${booking?.booking_number || ''}`.trim(),
            quantity: 1,
            unitPrice: total,
            total,
          },
        ];
    return {
      documentType: 'invoice',
      documentNumber: inv.invoice_number || String(inv.id).slice(0, 8),
      date: (inv.issue_date || inv.created_at || new Date().toISOString()).split('T')[0],
      dueDate: inv.due_date || undefined,
      ...companyBlock,
      customerName: customer?.name || inv.customer_name || booking?.customer_name || 'عميل',
      customerEmail: customer?.email || undefined,
      customerPhone: customer?.phone || undefined,
      items,
      subtotal: Number(inv.total_amount ?? total),
      discount: Number(inv.discount_amount ?? 0) || undefined,
      vat: Number(inv.tax_amount ?? 0) || undefined,
      totalAmount: total,
      paidAmount: Number(inv.paid_amount ?? 0),
      remainingAmount: Math.max(0, total - Number(inv.paid_amount ?? 0)),
      currency: inv.currency || workspace.financials.currency,
      bookingReference: booking?.booking_number || undefined,
      destination: booking?.destination || undefined,
    };
  };

  const persistDocument = async (
    blob: Blob,
    docType: 'invoice' | 'voucher',
    docNumber: string,
    totalAmount: number,
    currency: string,
    extra: Record<string, any> = {},
  ) => {
    const orgId = booking?.organization_id;
    if (!orgId) return null;
    const filePath = `${orgId}/${docType}/${docNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(filePath, blob, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;
    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 7 * 24 * 3600);

    await anyClient.from('generated_documents').upsert(
      {
        organization_id: orgId,
        booking_id: booking.id,
        customer_id: booking?.customer_id ?? null,
        customer_name: customer?.name || booking?.customer_name || null,
        document_type: docType,
        document_number: docNumber,
        title: `${docType === 'voucher' ? 'فاوتشر' : 'فاتورة'} ${docNumber}`,
        file_path: filePath,
        file_url: urlData?.signedUrl ?? null,
        total_amount: totalAmount,
        currency,
        ...extra,
      },
      { onConflict: 'organization_id,document_number' },
    );
    return urlData?.signedUrl ?? null;
  };

  const handleIssueVoucher = async () => {
    if (!booking?.id) return;
    setBusy('voucher');
    try {
      const existing = (vouchersQ.data ?? [])[0];
      const voucherNumber =
        existing?.voucher_number ||
        `VCH-${(booking.booking_number || booking.id.slice(0, 8)).replace(/^BK-/, '')}`;

      const blob = await generateDocumentPDF(buildVoucherData(voucherNumber));
      const url = await persistDocument(
        blob,
        'voucher',
        voucherNumber,
        Number(booking?.selling_price ?? 0),
        booking?.currency || workspace.financials.currency,
      );

      if (existing) {
        await anyClient.from('booking_vouchers').update({ pdf_url: url }).eq('id', existing.id);
      } else {
        await anyClient.from('booking_vouchers').insert({
          organization_id: booking.organization_id,
          booking_id: booking.id,
          voucher_number: voucherNumber,
          pdf_url: url,
          qr_payload: {
            booking_number: booking.booking_number,
            voucher_number: voucherNumber,
            customer: customer?.name || booking?.customer_name || null,
          },
        });
      }

      downloadBlob(blob, `${voucherNumber}.pdf`);
      qc.invalidateQueries({ queryKey: ['workspace-vouchers', booking.id] });
      qc.invalidateQueries({ queryKey: ['workspace-generated-docs', booking.id] });
      toast.success('تم إصدار الفاوتشر وتحميله');
    } catch (e: any) {
      toast.error(e.message || 'تعذّر إصدار الفاوتشر');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadInvoice = async (inv: any) => {
    setBusy(`inv-${inv.id}`);
    try {
      const data = buildInvoiceData(inv);
      const blob = await generateDocumentPDF(data);
      try {
        await persistDocument(blob, 'invoice', data.documentNumber, data.totalAmount, data.currency, {
          invoice_id: inv.id,
        });
        qc.invalidateQueries({ queryKey: ['workspace-generated-docs', booking?.id] });
      } catch {
        /* download still works even if storage save fails */
      }
      downloadBlob(blob, `${data.documentNumber}.pdf`);
      toast.success('تم تحميل الفاتورة');
    } catch (e: any) {
      toast.error(e.message || 'تعذّر تحميل الفاتورة');
    } finally {
      setBusy(null);
    }
  };

  const vouchers = vouchersQ.data ?? [];
  const invoices = (workspace.invoices ?? []) as any[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />
          إصدار وتحميل المستندات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleIssueVoucher} disabled={!booking?.id || busy === 'voucher'}>
            {busy === 'voucher' ? (
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
            ) : (
              <Ticket className="h-4 w-4 ml-1" />
            )}
            {vouchers.length ? 'إعادة إصدار الفاوتشر' : 'إصدار فاوتشر'}
          </Button>
          {vouchers[0]?.pdf_url && (
            <Button asChild size="sm" variant="outline">
              <a href={vouchers[0].pdf_url} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4 ml-1" /> تحميل آخر فاوتشر
              </a>
            </Button>
          )}
        </div>

        {vouchers.length > 0 && (
          <div className="space-y-1.5">
            {vouchers.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{v.voucher_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.issued_at || v.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">فاوتشر</Badge>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Receipt className="h-3 w-3" /> الفواتير
          </p>
          {invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد فواتير لهذا الحجز بعد.</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{inv.invoice_number || String(inv.id).slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(inv.final_amount ?? inv.total_amount ?? 0).toLocaleString()}{' '}
                    {inv.currency || workspace.financials.currency}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadInvoice(inv)}
                  disabled={busy === `inv-${inv.id}`}
                >
                  {busy === `inv-${inv.id}` ? (
                    <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 ml-1" />
                  )}
                  تحميل PDF
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingDocumentActions;
