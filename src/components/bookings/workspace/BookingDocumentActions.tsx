import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Download, Loader2, Receipt, Eye } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildInvoiceModel, buildVoucherModel } from '@/lib/travelDocuments';
import { useBookingDocumentSources } from '@/hooks/useBookingDocumentSources';
import { InvoiceDocument } from '@/components/documents/travel/InvoiceDocument';
import { VoucherDocument } from '@/components/documents/travel/VoucherDocument';
import { DocumentPreviewDialog } from '@/components/documents/travel/DocumentPreviewDialog';
import type { Workspace } from './types';

const anyClient = supabase as any;


interface Props {
  workspace: Workspace;
}

export const BookingDocumentActions = ({ workspace }: Props) => {
  const qc = useQueryClient();
  const booking: any = workspace.booking;
  const customer: any = workspace.customer;
  const { getSource } = useBookingDocumentSources({
    booking,
    customer,
    itinerary: (workspace as any).itinerary,
  });
  const [preview, setPreview] = useState<
    | { type: 'voucher'; voucherNumber: string; issuedAt?: string | null }
    | { type: 'invoice'; invoice: any }
    | null
  >(null);

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

  const invoiceModel = preview?.type === 'invoice' ? buildInvoiceModel(preview.invoice, getSource('invoice')) : null;
  const voucherModel =
    preview?.type === 'voucher'
      ? buildVoucherModel(preview.voucherNumber, getSource('voucher'), preview.issuedAt)
      : null;


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

    const payload = {
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
    };

    const { data: existingDoc } = await anyClient
      .from('generated_documents')
      .select('id')
      .eq('organization_id', orgId)
      .eq('document_number', docNumber)
      .maybeSingle();

    if (existingDoc?.id) {
      await anyClient.from('generated_documents').update(payload).eq('id', existingDoc.id);
    } else {
      await anyClient.from('generated_documents').insert(payload);
    }
    return urlData?.signedUrl ?? null;
  };

  /** Ensures the voucher business record exists, then opens the premium preview. */
  const handleIssueVoucher = async () => {
    if (!booking?.id) return;
    setBusy('voucher');
    try {
      const existing = (vouchersQ.data ?? [])[0];
      const voucherNumber =
        existing?.voucher_number ||
        `VCH-${(booking.booking_number || booking.id.slice(0, 8)).replace(/^BK-/, '')}`;

      if (!existing) {
        await anyClient.from('booking_vouchers').insert({
          organization_id: booking.organization_id,
          booking_id: booking.id,
          voucher_number: voucherNumber,
          qr_payload: {
            booking_number: booking.booking_number,
            voucher_number: voucherNumber,
            customer: customer?.name || booking?.customer_name || null,
          },
        });
        qc.invalidateQueries({ queryKey: ['workspace-vouchers', booking.id] });
      }

      setPreview({ type: 'voucher', voucherNumber, issuedAt: existing?.issued_at ?? null });
    } catch (e: any) {
      toast.error(e.message || 'تعذّر إصدار الفاوتشر');
    } finally {
      setBusy(null);
    }
  };

  /** Store the rendered PDF against the existing voucher/document records (no duplicates). */
  const persistVoucherPdf = async (blob: Blob, voucherNumber: string) => {
    try {
      const url = await persistDocument(
        blob,
        'voucher',
        voucherNumber,
        0,
        booking?.currency || workspace.financials.currency,
      );
      const existing = (vouchersQ.data ?? []).find((v: any) => v.voucher_number === voucherNumber);
      if (existing) {
        await anyClient.from('booking_vouchers').update({ pdf_url: url }).eq('id', existing.id);
      }
      qc.invalidateQueries({ queryKey: ['workspace-vouchers', booking?.id] });
      qc.invalidateQueries({ queryKey: ['workspace-generated-docs', booking?.id] });
    } catch {
      /* download still works even if storage save fails */
    }
  };

  const persistInvoicePdf = async (blob: Blob, inv: any, docNumber: string) => {
    try {
      await persistDocument(
        blob,
        'invoice',
        docNumber,
        Number(inv.final_amount ?? inv.total_amount ?? 0),
        inv.currency || workspace.financials.currency,
        { invoice_id: inv.id },
      );
      qc.invalidateQueries({ queryKey: ['workspace-generated-docs', booking?.id] });
    } catch {
      /* download still works even if storage save fails */
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">فاوتشر</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPreview({
                        type: 'voucher',
                        voucherNumber: v.voucher_number,
                        issuedAt: v.issued_at ?? v.created_at,
                      })
                    }
                  >
                    <Eye className="h-4 w-4 ml-1" /> معاينة
                  </Button>
                </div>
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
                <Button size="sm" variant="outline" onClick={() => setPreview({ type: 'invoice', invoice: inv })}>
                  <Eye className="h-4 w-4 ml-1" /> معاينة وتحميل
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {invoiceModel && preview?.type === 'invoice' && (
        <DocumentPreviewDialog
          open
          onOpenChange={(o) => !o && setPreview(null)}
          title={`فاتورة ${invoiceModel.documentNumber}`}
          fileName={`${invoiceModel.documentNumber}.pdf`}
          onGenerated={(blob) => persistInvoicePdf(blob, preview.invoice, invoiceModel.documentNumber)}
        >
          {(ref) => <InvoiceDocument ref={ref} model={invoiceModel} />}
        </DocumentPreviewDialog>
      )}

      {voucherModel && preview?.type === 'voucher' && (
        <DocumentPreviewDialog
          open
          onOpenChange={(o) => !o && setPreview(null)}
          title={`فاوتشر ${voucherModel.voucherNumber}`}
          fileName={`${voucherModel.voucherNumber}.pdf`}
          onGenerated={(blob) => persistVoucherPdf(blob, voucherModel.voucherNumber)}
        >
          {(ref) => <VoucherDocument ref={ref} model={voucherModel} />}
        </DocumentPreviewDialog>
      )}
    </Card>
  );
};


export default BookingDocumentActions;
