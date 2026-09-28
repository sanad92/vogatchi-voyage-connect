import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import type { Quote, QuoteItem } from '@/hooks/useQuotes';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const CHECKS = [
  { key: 'availability', label: 'تأكدت من توافر الفنادق والخدمات في التواريخ المطلوبة' },
  { key: 'cost', label: 'أدخلت التكلفة الفعلية لكل البنود' },
  { key: 'currency', label: 'راجعت عملة العرض' },
  { key: 'total', label: 'راجعت الإجمالي النهائي للعميل' },
] as const;

export default function QuoteReviewDialog({ quote, items }: { quote: Quote; items: QuoteItem[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [costs, setCosts] = useState<Record<string, string>>(
    () => Object.fromEntries(items.map((i) => [i.id, i.cost_price ? String(i.cost_price) : ''])),
  );
  const [saving, setSaving] = useState(false);

  const costsValid = items.every((i) => Number(costs[i.id]) > 0);
  const allChecked = CHECKS.every((c) => checks[c.key]);

  const approve = async () => {
    if (!allChecked || !costsValid || saving) return;
    setSaving(true);
    try {
      const { error } = await callUntypedRpc('approve_quote_review', {
        _quote: quote.id, _checks: checks,
        _costs: Object.fromEntries(items.map((i) => [i.id, Number(costs[i.id])])),
      });
      if (error) throw new Error(error.message);
      qc.invalidateQueries({ queryKey: ['quote'] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('تم اعتماد العرض — يمكنك إرساله الآن');
      setOpen(false);
    } catch (e: any) {
      toast.error('تعذّر الاعتماد: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><ShieldCheck className="h-4 w-4 ml-1" /> مراجعة واعتماد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>اعتماد العرض قبل الإرسال</DialogTitle></DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">تكلفة البنود (داخلية — لا تظهر للعميل)</p>
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate" title={i.description}>{i.description}</span>
              <span className="text-muted-foreground text-xs whitespace-nowrap">بيع {Number(i.selling_price).toLocaleString()}</span>
              <Input type="number" min={0} className="h-8 w-28" placeholder="التكلفة" aria-label={`تكلفة ${i.description}`}
                value={costs[i.id] ?? ''} onChange={(e) => setCosts((c) => ({ ...c, [i.id]: e.target.value }))} />
            </div>
          ))}
        </div>

        <div className="rounded-md bg-muted p-3 text-sm flex justify-between">
          <span>الإجمالي للعميل</span>
          <span className="font-semibold">{Number(quote.total_amount).toLocaleString()} {quote.currency}</span>
        </div>

        <div className="space-y-2">
          {CHECKS.map((c) => (
            <label key={c.key} className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={!!checks[c.key]} className="mt-0.5"
                onCheckedChange={(v) => setChecks((s) => ({ ...s, [c.key]: v === true }))} />
              {c.label}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={approve} disabled={!allChecked || !costsValid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'اعتماد العرض'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
