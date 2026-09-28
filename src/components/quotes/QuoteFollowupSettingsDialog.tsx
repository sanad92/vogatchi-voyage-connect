import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings2, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DEFAULT_FOLLOWUP_TEMPLATE } from './QuoteWhatsAppFollowupButton';

const MAX_STEPS = 5;

export default function QuoteFollowupSettingsDialog() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<string[]>(['1', '3', '7']);
  const [template, setTemplate] = useState(DEFAULT_FOLLOWUP_TEMPLATE);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ['quote-followup-settings', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('organization_settings')
        .select('id, quote_followup_days, quote_followup_template').eq('organization_id', orgId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && open,
  });

  useEffect(() => {
    if (!data) return;
    if (Array.isArray(data.quote_followup_days)) setDays(data.quote_followup_days.map(String));
    if (data.quote_followup_template) setTemplate(data.quote_followup_template);
  }, [data]);

  const nums = days.map((d) => Number(d));
  const error =
    nums.some((n) => !Number.isInteger(n) || n < 1 || n > 90) ? 'كل يوم لازم يكون رقم صحيح بين 1 و 90'
    : nums.some((n, i) => i > 0 && n <= nums[i - 1]) ? 'رتّب الأيام تصاعديًا بدون تكرار'
    : template.trim().length < 10 ? 'نص الرسالة قصير جدًا' : null;

  const save = async () => {
    if (error || saving || !orgId) return;
    if (!data?.id) { toast.error('احفظ إعدادات الشركة أولاً من صفحة الإعدادات'); return; }
    setSaving(true);
    const { error: e } = await (supabase as any).from('organization_settings')
      .update({ quote_followup_days: nums, quote_followup_template: template.trim() })
      .eq('organization_id', orgId);
    setSaving(false);
    if (e) { toast.error('تعذّر الحفظ: ' + e.message); return; }
    qc.invalidateQueries({ queryKey: ['quote-followup-settings', orgId] });
    qc.invalidateQueries({ queryKey: ['quote-wa-conversation'] });
    toast.success('تم حفظ جدول المتابعة — يُطبق على العروض المرسلة من الآن');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Settings2 className="h-4 w-4 ml-1" /> إعدادات المتابعة</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>متابعة العروض المرسلة</DialogTitle></DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">التذكير بعد كام يوم من الإرسال</p>
          <div className="flex flex-wrap items-center gap-2">
            {days.map((d, i) => (
              <div key={i} className="flex items-center gap-1 rounded-md border px-2 py-1">
                <Input type="number" min={1} max={90} value={d} aria-label={`تذكير ${i + 1}`} className="h-7 w-16 text-center"
                  onChange={(e) => setDays((all) => all.map((x, j) => (j === i ? e.target.value : x)))} />
                <span className="text-xs text-muted-foreground">يوم</span>
                {days.length > 1 && (
                  <button type="button" aria-label="حذف" onClick={() => setDays((all) => all.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
            {days.length < MAX_STEPS && (
              <Button type="button" size="sm" variant="ghost"
                onClick={() => setDays((all) => [...all, String(Math.min(90, (Number(all[all.length - 1]) || 0) + 7))])}>
                <Plus className="h-4 w-4" /> تذكير
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">نص رسالة المتابعة على واتساب</p>
          <Textarea rows={4} maxLength={1000} value={template} onChange={(e) => setTemplate(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            متغيرات: {'{customer_name}'} اسم العميل، {'{quote_number}'} رقم العرض، {'{destination}'} الوجهة، {'{total}'} الإجمالي.
            الرسالة تظهر في خانة الكتابة للمراجعة قبل الإرسال.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button onClick={save} disabled={!!error || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
