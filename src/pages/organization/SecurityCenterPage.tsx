import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Lock } from 'lucide-react';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { BROWSER_SESSION_INACTIVITY_MINUTES } from '@/lib/browserSessionActivity';

export default function SecurityCenterPage() {
  const { data, isError, isPending, setPin } = useSecuritySettings();
  const [pin, setPinValue] = useState('');
  const passwordPolicy = data?.password_policy;
  const passwordRequirements = passwordPolicy && [
    passwordPolicy.require_upper && 'حرف كبير',
    passwordPolicy.require_number && 'رقم',
    passwordPolicy.require_symbol && 'رمز خاص',
  ].filter(Boolean).join('، ');

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> مركز الأمان</h1>
        <p className="text-sm text-muted-foreground">إعدادات الأمان والحماية للمؤسسة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> السياسات العامة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="browser-session-timeout">مهلة عدم النشاط في المتصفح (بالدقائق)</Label>
              <Input id="browser-session-timeout" type="number" value={BROWSER_SESSION_INACTIVITY_MINUTES} readOnly />
              <p className="mt-1 text-xs text-muted-foreground">تُطبّق المهلة على جلسات المتصفح في كل المؤسسات.</p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">سياسات المؤسسة غير المطبّقة حاليًا</p>
              <p className="mt-1 text-xs text-muted-foreground">
                فرض المصادقة الثنائية، تقييد عناوين IP وشروط كلمة المرور المخصصة غير متاحة على مستوى المؤسسة حاليًا.
                القيم المحفوظة سابقًا معروضة للمراجعة فقط.
              </p>
              {isPending && <p role="status" className="mt-3 text-xs text-muted-foreground">جاري تحميل القيم المحفوظة…</p>}
              {isError && <p role="alert" className="mt-3 text-xs text-destructive">تعذّر تحميل القيم المحفوظة.</p>}
              {!isPending && !isError && !data && (
                <p className="mt-3 text-xs text-muted-foreground">لا توجد قيم سابقة محفوظة لهذه المؤسسة.</p>
              )}
              {data && (
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="font-medium">المصادقة الثنائية</dt>
                    <dd className="text-muted-foreground">{data.mfa_required ? 'الإلزام محدد في القيم المحفوظة' : 'الإلزام غير محدد في القيم المحفوظة'}</dd>
                  </div>
                  {passwordPolicy && (
                    <div>
                      <dt className="font-medium">شروط كلمة المرور المحفوظة</dt>
                      <dd className="text-muted-foreground">
                        الحد الأدنى {passwordPolicy.min_length} أحرف{passwordRequirements && `، مع ${passwordRequirements}`}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt><Label htmlFor="saved-ip-allowlist">قائمة IP المحفوظة</Label></dt>
                    <dd className="mt-1">
                      {data.ip_allowlist?.length ? (
                        <Textarea id="saved-ip-allowlist" dir="ltr" rows={3} value={data.ip_allowlist.join('\n')} readOnly />
                      ) : <p className="text-xs text-muted-foreground">القائمة المحفوظة فارغة.</p>}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" /> رمز PIN للمؤسسة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              رمز مكوّن من 6 أرقام يُطلب من مسؤولي المنصة عند طلب الوصول لحساب مؤسستك.
              يُخزَّن مشفَّرًا ولن يظهر مجددًا بعد الحفظ.
            </div>
            {data?.org_pin_set_at && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                تم تعيينه في {new Date(data.org_pin_set_at).toLocaleString('ar-EG')}
              </Badge>
            )}
            <div>
              <Label>PIN جديد (6 أرقام)</Label>
              <Input type="password" maxLength={6} value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))} />
            </div>
            <Button onClick={() => { setPin.mutate(pin, { onSuccess: () => setPinValue('') }); }} disabled={pin.length !== 6 || setPin.isPending}>
              {data?.org_pin_set_at ? 'تحديث PIN' : 'تعيين PIN'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
