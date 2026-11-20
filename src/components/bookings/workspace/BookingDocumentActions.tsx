import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Download, Loader2, Receipt, Eye } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildInvoiceModel, buildVoucherModel } from '@/lib/travelDocuments';
import { bookingVoucherState } from '@/lib/bookingVoucher';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useWorkspaceVouchers } from '@/hooks/useWorkspaceVouchers';
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
  const { hasPermission } = useSupabasePermissions();
  const [checkedVoucherState, setCheckedVoucherState] = useState<ReturnType<typeof bookingVoucherState>>();
  useEffect(() => setCheckedVoucherState(undefined), [booking?.id, booking?.status, booking?.workflow_stage]);
  const voucherState = checkedVoucherState ?? bookingVoucherState(booking);
  const canIssue = Boolean(booking?.id && hasPermission('bookings_view') && hasPermission('documents_create') && voucherState === 'current');
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

  const vouchersQ = useWorkspaceVouchers(booking?.id);

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
    const payload = {
      organization_id: orgId,
      booking_id: booking.id,
      customer_id: booking?.customer_id ?? null,
      customer_name: customer?.name || booking?.customer_name || null,
      document_type: docType,
      document_number: docNumber,
      title: `${docType === 'voucher' ? 'فاوتشر' : 'فاتورة'} ${docNumber}`,
      file_path: filePath,
      // Never persist signed links: they are bearer tokens. Links are minted on demand.
      file_url: null,
      total_amount: totalAmount,
      currency,
      ...extra,
    };

    const generatedDocs = supabase.from('generated_documents');
    const { data: existingDoc, error: lookupError } = await generatedDocs
      .select('id, file_path, booking_id, document_type')
      .eq('organization_id', orgId)
      .eq('document_number', docNumber)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existingDoc && (existingDoc.booking_id !== booking.id || existingDoc.document_type !== docType)) {
      throw new Error('رقم المستند مسجل لحجز أو نوع مختلف. تعذّر حفظ نسخة جديدة.');
    }

    // Storage needs a visible metadata record before its upload permission check.
    let insertedId: string | undefined;
    if (!existingDoc) {
      const { data, error } = await generatedDocs.insert(payload).select('id').single();
      if (error) throw error;
      insertedId = data.id;
    } else if (existingDoc.file_path !== filePath) {
      const { error } = await generatedDocs.update({ file_path: filePath }).eq('id', existingDoc.id);
      if (error) throw error;
    }

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, blob, { contentType: 'application/pdf', upsert: true });
    if (uploadError) {
      if (insertedId) {
        await generatedDocs.delete().eq('id', insertedId);
      } else if (existingDoc && existingDoc.file_path !== filePath) {
        await generatedDocs.update({ file_path: existingDoc.file_path }).eq('id', existingDoc.id).eq('file_path', filePath);
      }
      throw uploadError;
    }

    if (existingDoc) {
      const { error } = await generatedDocs.update(payload).eq('id', existingDoc.id);
      if (error) throw error;
    }
    return filePath;
  };

  const verifyVoucherEligibility = async () => {
    const { data, error } = await supabase.from('bookings').select('status, workflow_stage')
      .eq('id', booking.id).eq('organization_id', booking.organization_id).single();
    if (error) throw new Error('تعذّر التحقق من حالة الحجز.');
    const state = bookingVoucherState(data);
    setCheckedVoucherState(state);
    if (state === 'cancelled') throw new Error('الحجز ملغي. الفاوتشر السابق متاح في الأرشيف للمعاينة فقط.');
    if (state !== 'current') throw new Error('يجب تأكيد الحجز قبل إصدار الفاوتشر.');
  };

  const openStoredVoucher = async (path: string) => {
    if (!path || /^https?:/i.test(path)) return;
    const tab = window.open('', '_blank');
    if (!tab) {
      toast.error('اسمح بالنوافذ المنبثقة لفتح الفاوتشر.');
      return;
    }
    tab.opener = null;
    try {
      await verifyVoucherEligibility();
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60);
      if (error || !data?.signedUrl) throw new Error('تعذّر فتح الفاوتشر.');
      if (!tab.closed) tab.location.replace(data.signedUrl);
    } catch (error) {
      tab.close();
      toast.error(error instanceof Error ? error.message : 'تعذّر فتح الفاوتشر.');
    }
  };

  /** Ensures the voucher business record exists, then opens its preview. */
  const handleIssueVoucher = async () => {
    if (!canIssue || busy === 'voucher') return;
    setBusy('voucher');
    try {
      await verifyVoucherEligibility();
      const result = await vouchersQ.refetch();
      if (result.error) throw result.error;
      let existing = result.data?.[0];
      const voucherNumber = existing?.voucher_number ||
        `VCH-${(booking.booking_number || booking.id.slice(0, 8)).replace(/^BK-/, '')}`;

      if (!existing) {
        const { error } = await supabase.from('booking_vouchers').upsert({
          organization_id: booking.organization_id,
          booking_id: booking.id,
          voucher_number: voucherNumber,
          qr_payload: {
            booking_number: booking.booking_number,
            voucher_number: voucherNumber,
            customer: customer?.name || booking?.customer_name || null,
          },
        }, { onConflict: 'booking_id', ignoreDuplicates: true });
        if (error) throw error;
        const current = await vouchersQ.refetch();
        if (current.error || !current.data?.[0]) throw new Error('تعذّر قراءة الفاوتشر بعد الحفظ.');
        existing = current.data[0];
      }

      setPreview({ type: 'voucher', voucherNumber: existing.voucher_number, issuedAt: existing.issued_at });
    } catch (e: any) {
      toast.error(e.message || 'تعذّر إصدار الفاوتشر');
    } finally {
      setBusy(null);
    }
  };

  /** Store the rendered PDF against the existing voucher/document records (no duplicates). */
  const persistVoucherPdf = async (blob: Blob, voucherNumber: string) => {
    await verifyVoucherEligibility();
    const url = await persistDocument(
      blob, 'voucher', voucherNumber, 0, booking?.currency || workspace.financials.currency,
    );
    if (!url) throw new Error('تعذّر حفظ الفاوتشر.');
    const { error } = await supabase.from('booking_vouchers').update({ pdf_url: url })
      .eq('organization_id', booking.organization_id).eq('booking_id', booking.id).eq('voucher_number', voucherNumber)
      .select('id').single();
    if (error) throw error;
    void qc.invalidateQueries({ queryKey: ['workspace-vouchers', booking.id] });
    void qc.invalidateQueries({ queryKey: ['workspace-generated-docs', booking.id] });
  };

  const persistInvoicePdf = async (blob: Blob, inv: any, docNumber: string) => {
    await persistDocument(
      blob, 'invoice', docNumber, Number(inv.final_amount ?? inv.total_amount ?? 0),
      inv.currency || workspace.financials.currency, { invoice_id: inv.id },
    );
    void qc.invalidateQueries({ queryKey: ['workspace-generated-docs', booking?.id] });
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
          <Button size="sm" onClick={handleIssueVoucher} disabled={!canIssue || busy === 'voucher'}>
            {busy === 'voucher' ? (
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
            ) : (
              <Ticket className="h-4 w-4 ml-1" />
            )}
            {vouchers.length ? 'إعادة إصدار الفاوتشر' : 'إصدار فاوتشر'}
          </Button>
          {voucherState === 'current' && vouchers[0]?.pdf_url && !/^https?:/i.test(vouchers[0].pdf_url) && (
            <Button size="sm" variant="outline" onClick={() => openStoredVoucher(vouchers[0].pdf_url)}>
              <Download className="h-4 w-4 ml-1" /> تحميل آخر فاوتشر
            </Button>
          )}
        </div>

        {voucherState === 'cancelled' && <p className="text-sm text-destructive">الحجز ملغي. الفاوتشرات السابقة متاحة للمعاينة المؤرشفة فقط.</p>}
        {voucherState === 'unconfirmed' && <p className="text-sm text-muted-foreground">أكّد الحجز قبل إصدار الفاوتشر.</p>}
        {voucherState === 'current' && !canIssue && <p className="text-sm text-muted-foreground">يلزم الحصول على صلاحية إصدار المستندات.</p>}

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
                  <Badge variant="outline" className="text-[10px]">{voucherState === 'current' ? 'فاوتشر' : 'مؤرشف'}</Badge>
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
          readOnly={!canIssue}
          beforeOutput={verifyVoucherEligibility}
          requireSavedCopy
          onGenerated={(blob) => persistVoucherPdf(blob, voucherModel.voucherNumber)}
        >
          {(ref) => <VoucherDocument ref={ref} model={voucherModel} state={voucherState} />}
        </DocumentPreviewDialog>
      )}
    </Card>
  );
};


export default BookingDocumentActions;
