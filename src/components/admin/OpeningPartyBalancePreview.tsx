import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useOrgId } from '@/hooks/useOrgId';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { openingPartyBalanceFields, openingPartyBalanceRows } from '@/lib/openingPartyBalances';
import { callUntypedRpc } from '@/lib/supabaseRpc';

type PartyType = 'customer' | 'supplier';
type PreviewRow = {
  party_type: PartyType;
  party_id: string;
  party_name: string | null;
  currency: string;
  legacy_balance: number;
  recorded_balance: number | null;
  difference: number | null;
  open_invoices: number;
  historical_estimate: boolean;
};
type ControlTotal = {
  entity_type: PartyType;
  currency: string;
  aging_total: number;
  control_balance: number;
  difference: number;
  historical_estimate_count: number;
  corrected_date_count: number;
};
type Preview = { rows: PreviewRow[]; controls: ControlTotal[] };

const typeLabel: Record<PartyType, string> = { customer: 'عميل', supplier: 'مورد' };
const format = new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (value: number | null) => value === null ? '—' : format.format(value);

function OpeningPartyBalanceForm({ orgId }: { orgId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const [date, setDate] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Preview>();
  const [busy, setBusy] = useState(false);

  const template = () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([[...openingPartyBalanceFields]]), 'opening_balances');
    XLSX.writeFile(book, 'opening_party_balances.xlsx');
  };

  const preview = async (file: File) => {
    if (pending.current || !date) return;
    pending.current = true;
    setBusy(true);
    setResult(undefined);
    setFileName(file.name);
    setError('');
    try {
      if (file.size > 2_000_000) throw new Error('أقصى حجم للملف 2 ميجابايت.');
      let cells: unknown[][];
      if (/\.csv$/i.test(file.name)) {
        const csv = Papa.parse<string[]>(await file.text(), { skipEmptyLines: 'greedy' });
        if (csv.errors.length) throw new Error(csv.errors[0].message);
        cells = csv.data;
      } else if (/\.xlsx?$/i.test(file.name)) {
        const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheet = book.Sheets[book.SheetNames[0]];
        cells = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [];
      } else {
        throw new Error('اختر ملف Excel أو CSV.');
      }
      const { data, error: rpcError } = await callUntypedRpc<Preview>('preview_opening_party_balances', {
        _org: orgId, _as_of: date, _rows: openingPartyBalanceRows(cells),
      });
      if (rpcError || !data) throw new Error(rpcError?.message || 'تعذر معاينة الأرصدة.');
      setResult(data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذر معاينة الأرصدة.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const missing = result?.rows.filter(row => row.party_name === null).length ?? 0;
  const differences = result?.rows.filter(row => row.difference !== null && row.difference !== 0).length ?? 0;

  return (
    <Card>
      <CardHeader><CardTitle>معاينة الأرصدة الافتتاحية</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          حدّد تاريخ القطع وقارن مستحقات ملفك بالفواتير المفتوحة المسجلة في سفر. في القالب استخدم
          customer أو supplier، ومعرّف الطرف من التصدير. أدخل المستحقات بقيم موجبة، أو صفرًا للمطابقة.
          المعاينة للقراءة فقط.
        </p>
        <label className="block space-y-1 text-sm">
          <span>تاريخ القطع</span>
          <Input type="date" value={date} disabled={busy} onChange={event => {
            setDate(event.target.value);
            setResult(undefined);
            setError('');
            setFileName('');
          }} />
        </label>
        <input type="file" ref={input} accept=".csv,.xlsx,.xls" className="hidden" onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void preview(file);
        }} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!date || busy} onClick={() => input.current?.click()}>معاينة ملف الأرصدة</Button>
          <Button type="button" variant="outline" onClick={template}>تنزيل قالب Excel</Button>
        </div>
        {fileName && <p className="break-all text-sm text-muted-foreground">{fileName}</p>}
        {busy && <p role="status" className="text-sm">جاري مطابقة الأرصدة…</p>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {result && <>
          <p role="status" className="text-sm">{result.rows.length} رصيد · {differences} فرق · {missing} طرف غير موجود</p>
          <div className="max-h-72 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                {['الطرف', 'العملة', 'رصيد الملف', 'المسجل', 'الفرق', 'الفواتير المفتوحة'].map(label => (
                  <th key={label} scope="col" className="p-2 text-start">{label}</th>
                ))}
              </tr></thead>
              <tbody>{result.rows.map(row => <tr key={`${row.party_type}:${row.party_id}:${row.currency}`} className="border-t">
                <td className="p-2">{typeLabel[row.party_type]} · {row.party_name ?? 'معرّف غير موجود'}{row.historical_estimate && ' (تقدير تاريخي)'}
                  {!row.party_name && <span className="block break-all text-xs text-muted-foreground">{row.party_id}</span>}
                </td>
                <td className="p-2">{row.currency}</td><td className="p-2">{money(row.legacy_balance)}</td>
                <td className="p-2">{money(row.recorded_balance)}</td><td className="p-2">{money(row.difference)}</td>
                <td className="p-2">{row.party_name === null ? '—' : row.open_invoices}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <h3 className="text-sm font-semibold">مطابقة ذمم المؤسسة مع الأستاذ العام</h3>
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                {['الذمم', 'العملة', 'إجمالي المستحق', 'حساب الرقابة', 'الفرق'].map(label => (
                  <th key={label} scope="col" className="p-2 text-start">{label}</th>
                ))}
              </tr></thead>
              <tbody>{result.controls.map(row => <tr key={`${row.entity_type}:${row.currency}`} className="border-t">
                <td className="p-2">{row.entity_type === 'customer' ? 'العملاء' : 'الموردون'}</td>
                <td className="p-2">{row.currency}</td><td className="p-2">{money(row.aging_total)}</td>
                <td className="p-2">{money(row.control_balance)}</td><td className="p-2">{money(row.difference)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {result.controls.some(row => row.historical_estimate_count || row.corrected_date_count) && (
            <p className="text-sm text-muted-foreground">بعض أرصدة المطابقة تعتمد على تقدير تاريخي أو تاريخ استحقاق مصحح.</p>
          )}
        </>}
      </CardContent>
    </Card>
  );
}

export default function OpeningPartyBalancePreview() {
  const orgId = useOrgId();
  const { hasAllPermissions } = usePermissionCheck();
  return orgId && hasAllPermissions(['financial_view', 'admin_settings'])
    ? <OpeningPartyBalanceForm key={orgId} orgId={orgId} /> : null;
}
