import React, { useMemo, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { normalizeWhatsAppPhone } from './NewConversationDialog';

interface ParsedContact { name: string; phone: string }

const digitsOf = (v?: string | null) => String(v ?? '').replace(/\D/g, '');
const PHONE_KEYS = ['phone', 'mobile', 'whatsapp', 'number', 'tel', 'رقم', 'هاتف', 'موبايل', 'جوال', 'واتس'];
const NAME_KEYS = ['name', 'customer', 'اسم', 'العميل'];

const pickKey = (keys: string[], candidates: string[]) =>
  keys.find((k) => candidates.some((c) => k.toLowerCase().includes(c)));

/** Turn rows (with or without a header) into name/phone pairs. */
const rowsToContacts = (rows: unknown[][]): Array<{ name: string; raw: string }> => {
  if (!rows.length) return [];
  const header = rows[0].map((c) => String(c ?? '').trim());
  const phoneIdx = header.findIndex((h) => pickKey([h], PHONE_KEYS));
  const nameIdx = header.findIndex((h) => pickKey([h], NAME_KEYS));
  const hasHeader = phoneIdx >= 0;
  const body = hasHeader ? rows.slice(1) : rows;
  return body.map((r) => {
    const cells = r.map((c) => String(c ?? '').trim());
    let pIdx = hasHeader ? phoneIdx : cells.findIndex((c) => digitsOf(c).length >= 8);
    const raw = pIdx >= 0 ? cells[pIdx] : '';
    const nIdx = hasHeader && nameIdx >= 0 ? nameIdx : cells.findIndex((c, i) => i !== pIdx && c && digitsOf(c).length < 8);
    return { raw, name: nIdx >= 0 ? cells[nIdx] : '' };
  }).filter((c) => c.raw);
};

const parseText = (text: string) =>
  rowsToContacts(text.split(/\r?\n/).map((l) => l.split(/[,;\t]/)).filter((r) => r.join('').trim()));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the customer ids (existing + newly created) so the caller can select them. */
  onImported?: (customerIds: string[]) => void;
  customers: any[];
}

export const ImportContactsDialog: React.FC<Props> = ({ open, onOpenChange, onImported, customers }) => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [rawRows, setRawRows] = useState<Array<{ name: string; raw: string }>>([]);
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState('');
  const [countryCode, setCountryCode] = useState('20');
  const [createMissing, setCreateMissing] = useState(true);
  const [working, setWorking] = useState(false);

  const source = rawRows.length ? rawRows : parseText(pasted);

  const { valid, invalid } = useMemo(() => {
    const seen = new Set<string>();
    const ok: ParsedContact[] = [];
    let bad = 0;
    for (const r of source) {
      const phone = normalizeWhatsAppPhone(r.raw, countryCode);
      if (phone.length < 10 || phone.length > 15) { bad++; continue; }
      if (seen.has(phone)) continue;
      seen.add(phone);
      ok.push({ phone, name: r.name });
    }
    return { valid: ok, invalid: bad };
  }, [source, countryCode]);

  const byTail = useMemo(() => {
    const m = new Map<string, string>();
    (customers ?? []).forEach((c) => { const d = digitsOf(c.phone); if (d.length >= 9) m.set(d.slice(-9), c.id); });
    return m;
  }, [customers]);

  const existingCount = valid.filter((c) => byTail.has(c.phone.slice(-9))).length;
  const newCount = valid.length - existingCount;

  const reset = () => { setRawRows([]); setPasted(''); setFileName(''); };

  const handleFile = async (file: File) => {
    try {
      setFileName(file.name);
      if (/\.csv$|\.txt$/i.test(file.name)) {
        const text = await file.text();
        const res = Papa.parse<string[]>(text, { skipEmptyLines: true });
        setRawRows(rowsToContacts(res.data));
      } else {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
        setRawRows(rowsToContacts(rows));
      }
    } catch {
      toast.error('تعذر قراءة الملف');
    }
  };

  const handleImport = async () => {
    if (!orgId || !valid.length) return;
    setWorking(true);
    try {
      const ids: string[] = [];
      const toCreate: ParsedContact[] = [];
      valid.forEach((c) => {
        const id = byTail.get(c.phone.slice(-9));
        if (id) ids.push(id); else toCreate.push(c);
      });
      if (createMissing && toCreate.length) {
        for (let i = 0; i < toCreate.length; i += 200) {
          const chunk = toCreate.slice(i, i + 200).map((c) => ({
            organization_id: orgId, name: c.name || `+${c.phone}`, phone: c.phone,
          }));
          const { data, error } = await (supabase as any).from('customers').insert(chunk).select('id');
          if (error) throw error;
          (data || []).forEach((r: any) => ids.push(r.id));
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      onImported?.(ids);
      toast.success(`تم استيراد ${ids.length} رقم`);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'تعذر الاستيراد');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> استيراد أرقام العملاء</DialogTitle>
          <DialogDescription>ارفع ملف Excel أو CSV (عمود للاسم وعمود للرقم)، أو الصق الأرقام — رقم في كل سطر، ويمكن كتابة الاسم بعده بفاصلة.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 border border-dashed rounded-md p-4 cursor-pointer hover:bg-muted text-sm">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span>{fileName || 'اختر ملف .xlsx أو .xls أو .csv'}</span>
            <input type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          </label>

          {!rawRows.length && (
            <div className="space-y-2">
              <Label>أو الصق الأرقام</Label>
              <Textarea rows={5} dir="ltr" value={pasted} onChange={(e) => setPasted(e.target.value)}
                placeholder={'01012345678, أحمد\n+966512345678, سارة'} />
            </div>
          )}

          <div className="space-y-2">
            <Label>الدولة الافتراضية للأرقام المحلية</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="20">مصر +20</SelectItem>
                <SelectItem value="966">السعودية +966</SelectItem>
                <SelectItem value="971">الإمارات +971</SelectItem>
                <SelectItem value="965">الكويت +965</SelectItem>
                <SelectItem value="intl">الأرقام دولية كاملة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={createMissing} onCheckedChange={(v) => setCreateMissing(!!v)} />
            إنشاء ملف عميل للأرقام غير المسجلة
          </label>

          {source.length > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>أرقام صالحة: <b>{valid.length}</b> — مسجلة مسبقًا: {existingCount} — جديدة: {newCount}</p>
              {invalid > 0 && <p className="text-destructive">أرقام غير صحيحة تم تجاهلها: {invalid}</p>}
              {!createMissing && newCount > 0 && <p className="text-muted-foreground">لن تُضاف الأرقام الجديدة لأن إنشاء الملفات متوقف.</p>}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleImport} disabled={!valid.length || working}>
            {working && <Loader2 className="h-4 w-4 animate-spin ml-1" />} استيراد وتحديد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
