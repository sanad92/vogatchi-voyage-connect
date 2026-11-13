import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { importFields, importKey, importRecordId, previewCompanyImport, type ImportTable, type ImportPreview } from '@/lib/companyDataImport';
import { safeRows } from '@/lib/spreadsheet-safe';

const labels: Record<ImportTable, string> = { customers: 'العملاء', suppliers: 'الموردون', employees: 'الموظفون' };
const pageSize = 1000;

function CompanyDataTransfer({ orgId, userId }: { orgId: string; userId: string }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [table, setTable] = useState<ImportTable>('customers');
  const [preview, setPreview] = useState<ImportPreview>();
  const [fileName, setFileName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number }>();

  const run = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setProcessing(true);
    try {
      await action();
    } catch (error) {
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : undefined;
      toast.error('تعذرت معالجة البيانات', { description: message });
    } finally {
      busy.current = false;
      setProcessing(false);
    }
  };

  const readFile = (file: File) => run(async () => {
    setPreview(undefined);
    setResult(undefined);
    setFileName(file.name);
    let cells: unknown[][];
    if (/\.csv$/i.test(file.name)) {
      const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: 'greedy' });
      if (parsed.errors.length) throw new Error(parsed.errors[0].message);
      cells = parsed.data;
    } else if (/\.xlsx?$/i.test(file.name)) {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      cells = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) : [];
    } else {
      throw new Error('اختر ملف Excel أو CSV.');
    }
    setPreview(previewCompanyImport(table, cells));
  });

  const loadRecords = async () => {
    const records: Record<string, unknown>[] = [];
    for (let start = 0; ; start += pageSize) {
      const { data, error } = await supabase.from(table).select('*').eq('organization_id', orgId)
        .order('id').range(start, start + pageSize - 1);
      if (error) throw error;
      records.push(...data);
      if (data.length < pageSize) return records;
    }
  };

  const save = () => run(async () => {
    if (!preview?.rows.length || preview.errors.length) return;
    const existing = new Set((await loadRecords()).map(row => importKey(table, row)));
    const pending = preview.rows.filter(row => !existing.has(row.key));
    const rows = await Promise.all(pending.map(async ({ record, key }) => ({
      ...record,
      id: await importRecordId(orgId, table, key),
      organization_id: orgId,
    })));
    let count = 0;
    if (rows.length) {
      const options = { onConflict: table === 'employees' ? 'employee_code' : 'id', ignoreDuplicates: true };
      const response = table === 'customers'
        ? await supabase.from('customers').upsert(rows.map((row, i) => ({
          ...row, name: pending[i].record.name, created_by: userId,
        })), options).select('id')
        : table === 'suppliers'
          ? await supabase.from('suppliers').upsert(rows.map((row, i) => ({
            ...row, name: pending[i].record.name, type: pending[i].record.type || 'hotel',
          })), options).select('id')
          : await supabase.from('employees').upsert(rows.map((row, i) => ({
            ...row, full_name: pending[i].record.full_name, employee_code: pending[i].record.employee_code,
          })), options).select('id');
      if (response.error) throw response.error;
      count = response.data.length;
    }
    setResult({ imported: count, skipped: preview.rows.length + preview.duplicates.length - count });
    setPreview(undefined);
    void queryClient.invalidateQueries({ queryKey: [table] });
    if (count) toast.success(`تم استيراد ${count} سجل`);
  });

  const exportFile = (template: boolean) => run(async () => {
    const rows = template ? [] : await loadRecords();
    const worksheet = template
      ? XLSX.utils.aoa_to_sheet([[...importFields[table]]])
      : XLSX.utils.json_to_sheet(safeRows(rows));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, table);
    XLSX.writeFile(workbook, `${table}${template ? '_template' : ''}.xlsx`);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />استيراد بيانات المؤسسة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={table} disabled={processing} onValueChange={(value: ImportTable) => {
          setTable(value);
          setPreview(undefined);
          setFileName('');
          setResult(undefined);
        }}>
          <SelectTrigger aria-label="نوع البيانات"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void readFile(file);
        }} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={processing} onClick={() => input.current?.click()}><Upload className="me-2 h-4 w-4" />اختيار ملف</Button>
          <Button type="button" variant="outline" disabled={processing} onClick={() => void exportFile(true)}>تنزيل قالب Excel</Button>
          <Button type="button" variant="outline" disabled={processing} onClick={() => void exportFile(false)}><Download className="me-2 h-4 w-4" />تصدير البيانات</Button>
        </div>
        {fileName && <p className="break-all text-sm text-muted-foreground">{fileName}</p>}
        {processing && <p role="status" className="text-sm text-muted-foreground">جاري معالجة الملف...</p>}
        {result && <Alert><AlertDescription>تم استيراد {result.imported} سجل. تم تخطي {result.skipped} سجل مكرر.</AlertDescription></Alert>}
        {preview && <>
          {preview.errors.length > 0 && <Alert variant="destructive"><AlertDescription>
            {preview.errors.slice(0, 10).map(error => <p key={error}>{error}</p>)}
            {preview.errors.length > 10 && <p>إجمالي أخطاء الملف {preview.errors.length}</p>}
          </AlertDescription></Alert>}
          <p className="text-sm">{preview.rows.length} سجل صالح · {preview.duplicates.length} تكرار في الملف</p>
          <div className="max-h-72 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2">الصف</th>{importFields[table].map(field => <th className="p-2 text-start" key={field}>{field}</th>)}</tr></thead>
              <tbody>{preview.rows.slice(0, 10).map(row => <tr className="border-t" key={row.row}>
                <td className="p-2 text-center">{row.row}</td>
                {importFields[table].map(field => <td className="p-2" key={field}>{row.record[field]}</td>)}
              </tr>)}</tbody>
            </table>
          </div>
          <Button type="button" disabled={processing || !preview.rows.length || preview.errors.length > 0} onClick={() => void save()}>تأكيد الاستيراد</Button>
        </>}
      </CardContent>
    </Card>
  );
}

export default function DataImportExport() {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  if (!orgId || !user) return null;
  return <CompanyDataTransfer key={`${orgId}:${user.id}`} orgId={orgId} userId={user.id} />;
}
