import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PilgrimageAgencyAccess({ agreementId, approved }: { agreementId: string; approved: boolean }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const key = ['pilgrimage-agency-access', agreementId];
  const access = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<string>('manage_pilgrimage_agency_portal', { _agreement: agreementId });
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async (newEmail: string | null) => {
      const { data, error } = await callUntypedRpc<string>('manage_pilgrimage_agency_portal', {
        _agreement: agreementId, _change: true, _email: newEmail,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: value => {
      queryClient.setQueryData(key, value);
      setEmail('');
      toast.success(value ? 'تم تفعيل دخول الوكيل.' : 'تم إيقاف دخول الوكيل.');
    },
    onError: error => toast.error('تعذر تحديث دخول الوكيل', { description: error.message }),
  });

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">دخول الوكيل على الاتفاق</h3>
      {access.isError && <p className="text-sm text-destructive" role="alert">تعذر تحميل إعدادات دخول الوكيل.</p>}
      {access.data && <div className="flex flex-wrap items-center gap-2 text-sm">
        <span dir="ltr">{access.data}</span>
        <Button type="button" size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate(null)}>إيقاف الدخول</Button>
        <Button type="button" size="sm" variant="outline" onClick={async () => {
          try {
            await navigator.clipboard.writeText(new URL('/pilgrimage/agency', window.location.origin).href);
            toast.success('تم نسخ رابط بوابة الوكيل.');
          } catch { toast.error('تعذر نسخ الرابط.'); }
        }}>نسخ رابط البوابة</Button>
      </div>}
      {approved && <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
        event.preventDefault();
        if (email.trim() && !save.isPending) save.mutate(email.trim());
      }}>
        <div className="min-w-52 flex-1 space-y-1">
          <Label htmlFor={`agency-email-${agreementId}`}>بريد عمل الوكيل</Label>
          <Input id={`agency-email-${agreementId}`} dir="ltr" type="email" required maxLength={254}
            value={email} onChange={event => setEmail(event.target.value)} disabled={save.isPending} />
        </div>
        <Button type="submit" size="sm" disabled={save.isPending || !email.trim()}>اعتماد البريد</Button>
      </form>}
      <p className="text-xs text-muted-foreground">الوكيل يدخل بحساب Safar وبريد العمل المؤكّد المرتبط بهذا الاتفاق.</p>
    </section>
  );
}
