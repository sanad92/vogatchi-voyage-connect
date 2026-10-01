import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useEmailAccounts, invokeEmailFn } from '@/hooks/useEmail';

type Provider = 'gmail' | 'outlook' | 'custom';
const PRESETS: Record<Provider, { label: string; imap: string; smtp: string }> = {
  gmail: { label: 'Gmail', imap: 'imap.gmail.com', smtp: 'smtp.gmail.com' },
  outlook: { label: 'Outlook', imap: 'outlook.office365.com', smtp: 'smtp.office365.com' },
  custom: { label: 'بريد الاستضافة', imap: '', smtp: '' },
};

interface Props { open: boolean; onOpenChange: (v: boolean) => void; canManage: boolean }

export function EmailAccountsDialog({ open, onOpenChange, canManage }: Props) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data: accounts = [] } = useEmailAccounts();
  const [adding, setAdding] = useState(accounts.length === 0);
  const [provider, setProvider] = useState<Provider>('gmail');
  const [f, setF] = useState({ email: '', displayName: '', username: '', password: '', imapHost: PRESETS.gmail.imap, imapPort: 993, smtpHost: PRESETS.gmail.smtp, smtpPort: 465 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (p: Provider) => { setProvider(p); setF((x) => ({ ...x, imapHost: PRESETS[p].imap, smtpHost: PRESETS[p].smtp, imapPort: 993, smtpPort: 465 })); };

  const submit = async () => {
    setError(null);
    if (!f.email || !f.password || !f.imapHost || !f.smtpHost) { setError('أكمل البيانات المطلوبة'); return; }
    setBusy(true);
    try {
      await invokeEmailFn('email-account-test', {
        organizationId: orgId, provider, email: f.email.trim(), displayName: f.displayName || null,
        imapHost: f.imapHost.trim(), imapPort: Number(f.imapPort), smtpHost: f.smtpHost.trim(), smtpPort: Number(f.smtpPort),
        username: (f.username || f.email).trim(), password: f.password,
      });
      toast.success('تم ربط البريد بنجاح — جاري جلب الرسائل');
      setF((x) => ({ ...x, password: '' }));
      setAdding(false);
      qc.invalidateQueries({ queryKey: ['email-accounts', orgId] });
      invokeEmailFn('email-sync', { organizationId: orgId }).then(() => qc.invalidateQueries({ queryKey: ['email-threads', orgId] })).catch(() => {});
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('فصل هذا البريد؟ سيتم حذف رسائله من النظام.')) return;
    const { error } = await (supabase as any).from('email_accounts').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('تم فصل البريد'); qc.invalidateQueries({ queryKey: ['email-accounts', orgId] }); qc.invalidateQueries({ queryKey: ['email-threads', orgId] }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>حسابات البريد</DialogTitle>
          <DialogDescription>اربط بريد الشركة عشان تقرأ وترد وتبعت من النظام.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate" dir="ltr">{a.email_address}</div>
                <div className="text-xs text-muted-foreground">
                  {a.sync_error ? <span className="text-destructive">{a.sync_error}</span>
                    : a.last_synced_at ? `آخر تحديث: ${new Date(a.last_synced_at).toLocaleString('ar-EG')}` : 'جاري أول مزامنة…'}
                </div>
              </div>
              {a.sync_error ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
              {canManage && <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="فصل"><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
          {!accounts.length && !canManage && <p className="text-sm text-muted-foreground">لا يوجد بريد مربوط. اطلب من المالك أو الأدمن ربطه.</p>}
        </div>

        {canManage && !adding && <Button variant="outline" onClick={() => setAdding(true)}><Plus className="h-4 w-4 ml-2" />ربط بريد جديد</Button>}

        {canManage && adding && (
          <div className="space-y-4 rounded-xl border border-border p-4">
            <div className="flex gap-2">
              {(Object.keys(PRESETS) as Provider[]).map((p) => (
                <Button key={p} type="button" size="sm" variant={provider === p ? 'default' : 'outline'} onClick={() => pick(p)}>{PRESETS[p].label}</Button>
              ))}
            </div>
            {provider === 'gmail' && <Alert><AlertDescription className="text-xs">لـ Gmail: فعّل التحقق بخطوتين، وبعدين من إعدادات حساب جوجل ← الأمان ← «كلمات مرور التطبيقات» اعمل كلمة مرور جديدة واستخدمها هنا بدل كلمة المرور العادية.</AlertDescription></Alert>}
            {provider === 'outlook' && <Alert><AlertDescription className="text-xs">تنبيه: Microsoft قافلة الدخول بكلمة المرور على كتير من الحسابات. لو الربط فشل، يبقى الحساب ده مش مدعوم بالطريقة دي.</AlertDescription></Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>البريد الإلكتروني</Label><Input dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="info@company.com" /></div>
              <div><Label>اسم المرسل</Label><Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} placeholder="Vogatchi Travel" /></div>
              <div><Label>اسم المستخدم (اختياري)</Label><Input dir="ltr" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="نفس البريد" /></div>
              <div className="col-span-2"><Label>كلمة المرور</Label><Input dir="ltr" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
              <div><Label>خادم الاستقبال (IMAP)</Label><Input dir="ltr" value={f.imapHost} onChange={(e) => setF({ ...f, imapHost: e.target.value })} placeholder="mail.company.com" /></div>
              <div><Label>المنفذ</Label><Input dir="ltr" type="number" value={f.imapPort} onChange={(e) => setF({ ...f, imapPort: Number(e.target.value) })} /></div>
              <div><Label>خادم الإرسال (SMTP)</Label><Input dir="ltr" value={f.smtpHost} onChange={(e) => setF({ ...f, smtpHost: e.target.value })} placeholder="mail.company.com" /></div>
              <div><Label>المنفذ <Badge variant="secondary" className="mr-1">465 فقط</Badge></Label><Input dir="ltr" type="number" value={f.smtpPort} onChange={(e) => setF({ ...f, smtpPort: Number(e.target.value) })} /></div>
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="flex gap-2 justify-end">
              {accounts.length > 0 && <Button variant="ghost" onClick={() => setAdding(false)}>إلغاء</Button>}
              <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}اختبار وربط</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
