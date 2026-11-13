import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrgId } from '@/hooks/useOrgId';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { hotelImportFields, hotelImportRows } from '@/lib/openHotelBookingImport';

type BookingImportResult = {
  entries: {
    reference: string;
    customer: string;
    supplier: string | null;
    hotel: string;
    check_in: string;
    check_out: string;
    currency: string;
    sale: number;
    cost: number;
  }[];
  imported: number;
  skipped: number;
};

function HotelBookingTransfer({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ rows: Record<string, string>[]; result: BookingImportResult }>();
  const [completed, setCompleted] = useState<BookingImportResult>();

  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذر استيراد الحجوزات.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const send = async (rows: Record<string, string>[], commit: boolean) => {
    const { data, error: failure } = await callUntypedRpc<BookingImportResult>('import_open_hotel_bookings', {
      _org: orgId, _rows: rows, _commit: commit,
    });
    if (failure || !data) throw new Error(failure?.message || 'لم يرجع الخادم نتيجة الاستيراد.');
    return data;
  };

  const review = (file: File) => run(async () => {
    setCompleted(undefined);
    setPreview(undefined);
    setConfirmed(false);
    if (file.size > 2_000_000) throw new Error('أقصى حجم للملف 2 ميجابايت.');
    let cells: unknown[][];
    if (/\.csv$/i.test(file.name)) {
      const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: 'greedy' });
      if (parsed.errors.length) throw new Error(parsed.errors[0].message);
      cells = parsed.data;
    } else if (/\.xlsx?$/i.test(file.name)) {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      cells = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [];
    } else {
      throw new Error('اختر ملف Excel أو CSV.');
    }
    const rows = hotelImportRows(cells);
    setPreview({ rows, result: await send(rows, false) });
  });

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[...hotelImportFields]]), 'open_hotel_bookings');
    XLSX.writeFile(workbook, 'open_hotel_bookings.xlsx');
  };

  const save = () => run(async () => {
    if (!preview?.result.entries.length || !confirmed) return;
    const result = await send(preview.rows, true);
    setCompleted(result);
    setPreview(undefined);
    setConfirmed(false);
    void Promise.all(['unified-bookings', 'bookings', 'invoices', 'supplier-payment-orders',
      'supplier-invoices', 'booking-workspace'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
  });

  return (
    <Card>
      <CardHeader><CardTitle>نقل حجوزات الفنادق المفتوحة</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          استخدم معرّفات العميل والمورد من ملفات التصدير. اكتب التواريخ بصيغة YYYY-MM-DD وحدد صفرًا
          في عمودي تحصيل العميل وسداد المورد. استورد 50 حجزًا كحد أقصى في كل دفعة.
        </p>
        <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void review(file);
        }} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>اختيار ملف للمعاينة</Button>
          <Button type="button" variant="outline" onClick={downloadTemplate}>تنزيل قالب Excel</Button>
        </div>
        {busy && <p role="status" className="text-sm text-muted-foreground">جاري معالجة الدفعة…</p>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {completed && <Alert><AlertDescription>
          تم إنشاء {completed.imported} حجز. تم تخطي {completed.skipped} حجز سبق نقله.
        </AlertDescription></Alert>}
        {preview && <>
          <p className="text-sm">{preview.result.entries.length} حجز جديد · {preview.result.skipped} سبق نقله</p>
          {preview.result.entries.length > 0 && <>
            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  {['المرجع', 'العميل', 'المورد', 'الفندق', 'الوصول', 'المغادرة', 'العملة', 'البيع', 'التكلفة'].map(label => (
                    <th scope="col" key={label} className="p-2 text-start">{label}</th>
                  ))}
                </tr></thead>
                <tbody>{preview.result.entries.map(row => <tr key={row.reference} className="border-t">
                  <td className="p-2">{row.reference}</td><td className="p-2">{row.customer}</td>
                  <td className="p-2">{row.supplier || '—'}</td><td className="p-2">{row.hotel}</td>
                  <td className="p-2">{row.check_in}</td><td className="p-2">{row.check_out}</td>
                  <td className="p-2">{row.currency}</td><td className="p-2">{row.sale}</td>
                  <td className="p-2">{row.cost}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={confirmed} disabled={busy} onCheckedChange={value => setConfirmed(value === true)} />
              أؤكد أن مبالغ هذه الحجوزات لم تُسجّل في سفر ضمن أرصدة افتتاحية أو فواتير. الحفظ ينشئ حجوزات وفواتير عملاء ومستحقات الموردين عند وجود تكلفة.
            </label>
            <Button type="button" disabled={busy || !confirmed} onClick={() => void save()}>إنشاء الحجوزات والفواتير</Button>
          </>}
        </>}
      </CardContent>
    </Card>
  );
}

export default function OpenHotelBookingImport() {
  const orgId = useOrgId();
  return orgId ? <HotelBookingTransfer key={orgId} orgId={orgId} /> : null;
}
