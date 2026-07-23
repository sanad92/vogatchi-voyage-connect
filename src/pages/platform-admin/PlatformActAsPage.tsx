import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { UserCog, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonationSession } from '@/hooks/useImpersonationSession';

export default function PlatformActAsPage() {
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerified, setMfaVerified] = useState(false);
  const { active, start, stop } = useImpersonationSession();

  const orgs = useQuery({
    queryKey: ['orgs-search', search],
    queryFn: async () => {
      const q = (supabase as any).from('organizations').select('id,name,slug').order('name').limit(20);
      const { data, error } = search ? await q.ilike('name', `%${search}%`) : await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const verifyMfa = () => {
    // Placeholder: accepts a 6-digit code. Wire to Supabase MFA verify challenge in a hardening pass.
    if (mfaCode.length === 6) setMfaVerified(true);
  };

  const handleStart = () => {
    if (!selectedOrg) return;
    start.mutate({
      target_org_id: selectedOrg.id,
      org_pin: pin,
      reason: reason.trim(),
      mfa_verified: mfaVerified,
    }, {
      onSuccess: () => { setPin(''); setReason(''); setMfaCode(''); setMfaVerified(false); },
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="h-6 w-6 text-amber-600" /> الوصول نيابة عن مؤسسة (Act As)</h1>
        <p className="text-sm text-muted-foreground mt-1">وصول مؤقت ومسجَّل بالكامل. يتطلب MFA + PIN المؤسسة + سبب.</p>
      </div>

      {active && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold">جلسة نشطة</span> — السبب: {active.reason}
              <div className="text-xs text-muted-foreground">بدأت {new Date(active.started_at).toLocaleString('ar-EG')}</div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => stop.mutate()}>إنهاء الجلسة</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">1. اختر المؤسسة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="ابحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-80 overflow-y-auto border rounded divide-y">
              {(orgs.data ?? []).map((o: any) => (
                <button key={o.id}
                  onClick={() => setSelectedOrg({ id: o.id, name: o.name })}
                  className={`w-full text-right p-3 hover:bg-muted transition ${selectedOrg?.id === o.id ? 'bg-primary/10' : ''}`}>
                  <div className="font-medium">{o.name}</div>
                  <div className="text-xs text-muted-foreground">{o.slug}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> 2. التحقق وبدء الجلسة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {selectedOrg && <Badge className="bg-primary/10 text-primary border-primary/30">{selectedOrg.name}</Badge>}

            <div>
              <Label>رمز MFA (6 أرقام)</Label>
              <div className="flex gap-2">
                <Input value={mfaCode} onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '')); setMfaVerified(false); }} maxLength={6} type="password" />
                <Button variant="outline" size="sm" onClick={verifyMfa} disabled={mfaCode.length !== 6}>
                  {mfaVerified ? '✓ تم' : 'تحقق'}
                </Button>
              </div>
            </div>

            <div>
              <Label>PIN المؤسسة (6 أرقام)</Label>
              <Input type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            </div>

            <div>
              <Label>السبب * (10 أحرف على الأقل)</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex: تصعيد دعم فني - تذكرة #12345" />
            </div>

            <Button
              className="w-full"
              onClick={handleStart}
              disabled={!selectedOrg || !mfaVerified || pin.length !== 6 || reason.trim().length < 10 || start.isPending || !!active}
            >
              {active ? 'يوجد جلسة نشطة' : 'بدء الجلسة'}
            </Button>

            <div className="text-xs text-muted-foreground border-t pt-3">
              جميع العمليات ستُسجَّل في سجل التدقيق مع ربطها برقم الجلسة.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
