import { useId, useState } from 'react';
import { History, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBankBaseline } from '@/hooks/useBankBaseline';

const money = (value: number | null | undefined, currency?: string | null) =>
  value === null || value === undefined
    ? '—'
    : `${new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}${currency ? ` ${currency}` : ''}`;

const actionLabels: Record<string, string> = {
  set: 'ضبط أولي',
  update: 'تعديل',
  clear: 'إلغاء الخط الأساس',
  correction: 'تصحيح بعد الإغلاق',
};

const message = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : 'حدث خطأ غير متوقع';

interface Props {
  accountId: string;
  currency?: string | null;
}

export const BankBaselineCard = ({ accountId, currency }: Props) => {
  const { toast } = useToast();
  const { baseline, setBaseline } = useBankBaseline(accountId);
  const data = baseline.data;
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({ balance: '', date: '', note: '', reason: '', confirm: false });

  const openEditor = () => {
    setForm({
      balance: data?.opening_balance != null ? String(data.opening_balance) : '',
      date: data?.opening_balance_date ?? '',
      note: '',
      reason: '',
      confirm: false,
    });
    setOpen(true);
  };

  if (!accountId) return null;

  const needsCorrection = Boolean(data?.locked);
  const canSubmit =
    Boolean(data?.can_manage) &&
    !baseline.isFetching && !baseline.isError &&
    form.note.trim().length > 0 &&
    form.date.length > 0 &&
    form.balance.trim().length > 0 &&
    Number.isFinite(Number(form.balance)) &&
    form.confirm &&
    (!needsCorrection || (data?.can_correct && form.reason.trim().length > 0));

  const submit = async () => {
    if (!canSubmit || setBaseline.isPending) return;
    try {
      await setBaseline.mutateAsync({
        balance: Number(form.balance),
        balanceDate: form.date,
        note: form.note.trim(),
        reason: form.reason.trim() || undefined,
        forceCorrection: needsCorrection,
      });
      setOpen(false);
      toast({ title: 'تم حفظ الرصيد الافتتاحي' });
    } catch (error) {
      toast({ title: 'تعذر حفظ الرصيد الافتتاحي', description: message(error), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">الرصيد الافتتاحي (خط الأساس)</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {data?.locked && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              مقفل بتسوية مغلقة
            </Badge>
          )}
          <Button variant="ghost" size="sm" disabled={!data || baseline.isError} onClick={() => setShowHistory((value) => !value)}>
            <History className="h-4 w-4 ml-1" />
            سجل التعديلات ({data?.history?.length ?? 0})
          </Button>
          {data?.can_manage && (
            <Button size="sm" variant="outline" disabled={baseline.isFetching || baseline.isError} onClick={openEditor}>
              {needsCorrection ? 'تصحيح خط الأساس' : data?.is_set ? 'تعديل خط الأساس' : 'ضبط خط الأساس'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {baseline.isPending ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل الرصيد الافتتاحي…
          </p>
        ) : baseline.isError ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>تعذر تحميل الرصيد الافتتاحي وسجل التعديلات. {message(baseline.error)}</p>
            <Button variant="outline" size="sm" disabled={baseline.isFetching} onClick={() => void baseline.refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : !data?.is_set ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            غير مضبوط. التسوية تعمل بالسلوك الحالي حتى يتم ضبط رصيد افتتاحي صريح.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <small className="text-muted-foreground">الرصيد الافتتاحي</small>
              <div className="font-bold">{money(data.opening_balance, currency ?? data.currency)}</div>
            </div>
            <div>
              <small className="text-muted-foreground">تاريخ خط الأساس</small>
              <div className="font-bold">{data.opening_balance_date}</div>
            </div>
            <div>
              <small className="text-muted-foreground">المصدر</small>
              <div className="font-bold">
                {data.set_by_name || 'غير معروف'}
                {data.set_at ? ` — ${new Date(data.set_at).toLocaleDateString('ar-EG')}` : ''}
              </div>
            </div>
            {data.note && <p className="md:col-span-3 text-muted-foreground">الملاحظة: {data.note}</p>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          ضبط خط الأساس لا يغيّر الرصيد الدفتري ولا ينشئ أي حركة مالية؛ هو مرجع لمطابقة الأرصدة التاريخية فقط.
        </p>
        {data?.locked && !data.can_correct && !baseline.isError && (
          <p className="text-sm text-muted-foreground">تصحيح خط الأساس بعد إغلاق تسوية متاح لمالك الشركة فقط، مع تسجيل السبب.</p>
        )}

        {showHistory && data && !baseline.isError && (
          <div className="border rounded-lg divide-y">
            {(data?.history ?? []).length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">لا توجد تعديلات مسجلة.</p>
            )}
            {(data?.history ?? []).map((entry) => (
              <div key={entry.id} className="p-3 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{actionLabels[entry.action] || entry.action}</Badge>
                  <span className="text-muted-foreground">
                    {new Date(entry.changed_at).toLocaleString('ar-EG')} — {entry.changed_by_name || 'غير معروف'}
                  </span>
                </div>
                <div>
                  {money(entry.old_balance, currency)} ({entry.old_balance_date || '—'}) ←{' '}
                  {money(entry.new_balance, currency)} ({entry.new_balance_date || '—'})
                </div>
                {entry.note && <div className="text-muted-foreground">الملاحظة: {entry.note}</div>}
                {entry.reason && <div className="text-muted-foreground">السبب: {entry.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{data?.is_set ? 'تعديل الرصيد الافتتاحي' : 'ضبط الرصيد الافتتاحي'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`${fieldId}-balance`}>الرصيد الافتتاحي</Label>
              <Input
                id={`${fieldId}-balance`}
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(event) => setForm((value) => ({ ...value, balance: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${fieldId}-date`}>تاريخ خط الأساس</Label>
              <Input
                id={`${fieldId}-date`}
                type="date"
                value={form.date}
                onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${fieldId}-note`}>ملاحظة (إلزامية)</Label>
              <Textarea
                id={`${fieldId}-note`}
                value={form.note}
                placeholder="مثال: رصيد كشف البنك في 2025-12-31"
                onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))}
              />
            </div>
            {needsCorrection && (
              <div className="space-y-1">
                <Label htmlFor={`${fieldId}-reason`}>سبب التصحيح (إلزامي بعد إغلاق تسوية)</Label>
                <Textarea
                  id={`${fieldId}-reason`}
                  value={form.reason}
                  onChange={(event) => setForm((value) => ({ ...value, reason: event.target.value }))}
                />
              </div>
            )}
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={form.confirm}
                onCheckedChange={(checked) => setForm((value) => ({ ...value, confirm: checked === true }))}
              />
              <span>أؤكد صحة هذا الرصيد الافتتاحي، وأعلم أنه يُسجَّل في سجل تدقيق دائم ولا يغيّر الأرصدة الحالية.</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button disabled={!canSubmit || setBaseline.isPending} onClick={() => void submit()}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BankBaselineCard;
