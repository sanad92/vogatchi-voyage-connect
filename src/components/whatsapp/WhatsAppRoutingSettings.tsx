import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function WhatsAppRoutingSettings() {
  const orgId = useOrgId();
  const { hasPermission } = useSupabasePermissions();
  const qc = useQueryClient();
  const [mode, setMode] = useState('manual');
  const [capacity, setCapacity] = useState(5);
  const query = useQuery({ queryKey: ['wa-routing-settings', orgId], enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('wa_routing_settings').select('*').eq('organization_id', orgId).maybeSingle();
      if (error) throw error;
      return data || { mode: 'manual', max_conversations: 5 };
    },
  });
  useEffect(() => { if (query.data) { setMode(query.data.mode); setCapacity(query.data.max_conversations); } }, [query.data]);
  const save = useMutation({ mutationFn: async () => {
    if (!hasPermission('whatsapp_admin') || !orgId) throw new Error('غير مصرح');
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) throw new Error('السعة من 1 إلى 50 محادثة');
    const { error } = await (supabase as any).from('wa_routing_settings').upsert({ organization_id: orgId, mode, max_conversations: capacity });
    if (error) throw error;
  }, onSuccess: () => { toast.success('تم حفظ سياسة التوزيع'); qc.invalidateQueries({ queryKey: ['wa-routing-settings', orgId] }); },
  onError: (e: Error) => toast.error(e.message) });
  return <section className="rounded-xl border bg-card p-5 space-y-4" dir="rtl">
    <div><h2 className="font-bold text-lg">طابور المحادثات والتوزيع</h2><p className="text-sm text-muted-foreground">سياسة مستقلة لكل مؤسسة؛ البوت يسلم المحادثة للطابور قبل التوزيع.</p></div>
    {query.isError && <p role="alert" className="text-destructive">تعذر تحميل سياسة التوزيع. تأكد من نشر تحديث قاعدة البيانات.</p>}
    <div className="grid sm:grid-cols-2 gap-4">
      <div><Label htmlFor="wa-routing-mode">طريقة التوزيع</Label><select id="wa-routing-mode" value={mode} onChange={e => setMode(e.target.value)} className="w-full border rounded-md p-2 bg-background">
        <option value="manual">يدوي — الموظف يستلم من الطابور</option>
        <option value="automatic">تلقائي — الأقل انشغالًا من المتاحين</option>
        <option value="hybrid">مختلط — توزيع تلقائي مع استلام يدوي</option>
      </select></div>
      <div><Label htmlFor="wa-capacity">الحد الأقصى للمحادثات المفتوحة لكل موظف</Label><Input id="wa-capacity" type="number" min={1} max={50} value={capacity} onChange={e => setCapacity(Number(e.target.value))} /></div>
    </div>
    <p className="text-sm text-muted-foreground">الموظف يفعّل «متاح للتوزيع» داخل صندوق المحادثات. يتوقف إسناد محادثات جديدة له بعد 90 ثانية بدون تحديث تواجده. المحادثات المسندة تظل معه حتى إغلاقها أو تحويلها.</p>
    <Button disabled={query.isLoading || query.isError || save.isPending || !hasPermission('whatsapp_admin')} onClick={() => save.mutate()}>حفظ سياسة التوزيع</Button>
  </section>;
}
