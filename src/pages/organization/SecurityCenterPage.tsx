import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Shield, Save, Key, Lock } from 'lucide-react';
import { useSecuritySettings, type SecuritySettings } from '@/hooks/useSecuritySettings';
import { BROWSER_SESSION_INACTIVITY_MINUTES } from '@/lib/browserSessionActivity';

type EditableSecuritySettings = Pick<SecuritySettings, 'mfa_required' | 'password_policy'>;

export default function SecurityCenterPage() {
  const { data, save, setPin } = useSecuritySettings();
  const [form, setForm] = useState<EditableSecuritySettings>({
    mfa_required: false,
    password_policy: { min_length: 8, require_upper: true, require_number: true, require_symbol: false },
  });
  const [pin, setPinValue] = useState('');
  const [ipList, setIpList] = useState('');

  useEffect(() => {
    if (data) {
      setForm({ mfa_required: data.mfa_required, password_policy: data.password_policy });
      setIpList((data.ip_allowlist ?? []).join('\n'));
    }
  }, [data]);

  const handleSave = () => {
    save.mutate({ ...form, ip_allowlist: ipList.split('\n').map((s) => s.trim()).filter(Boolean) });
  };

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
            <div className="flex items-center justify-between p-3 rounded bg-muted/50">
              <div>
                <div className="font-medium">فرض المصادقة الثنائية (MFA)</div>
                <div className="text-xs text-muted-foreground">إلزام جميع المستخدمين بتفعيل MFA</div>
              </div>
              <Switch checked={!!form.mfa_required} onCheckedChange={(v) => setForm({ ...form, mfa_required: v })} />
            </div>
            <div>
              <Label htmlFor="browser-session-timeout">مهلة عدم النشاط في المتصفح (بالدقائق)</Label>
              <Input id="browser-session-timeout" type="number" value={BROWSER_SESSION_INACTIVITY_MINUTES} readOnly />
              <p className="mt-1 text-xs text-muted-foreground">تُطبّق المهلة على جلسات المتصفح في كل المؤسسات.</p>
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs font-semibold">سياسة كلمة المرور</Label>
              <div><Label className="text-xs">الحد الأدنى للطول</Label><Input type="number" value={form.password_policy?.min_length ?? 8} onChange={(e) => setForm({ ...form, password_policy: { ...form.password_policy, min_length: parseInt(e.target.value) || 8 } })} /></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.password_policy?.require_upper} onCheckedChange={(v) => setForm({ ...form, password_policy: { ...form.password_policy, require_upper: v } })} /><Label>يجب أن تحتوي على حرف كبير</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.password_policy?.require_number} onCheckedChange={(v) => setForm({ ...form, password_policy: { ...form.password_policy, require_number: v } })} /><Label>يجب أن تحتوي على رقم</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.password_policy?.require_symbol} onCheckedChange={(v) => setForm({ ...form, password_policy: { ...form.password_policy, require_symbol: v } })} /><Label>يجب أن تحتوي على رمز خاص</Label></div>
            </div>
            <div>
              <Label>قائمة IP المسموح بها (سطر لكل عنوان)</Label>
              <Textarea rows={4} value={ipList} onChange={(e) => setIpList(e.target.value)} placeholder="192.168.1.0/24&#10;10.0.0.5" />
              <div className="text-xs text-muted-foreground mt-1">اتركها فارغة للسماح بجميع العناوين</div>
            </div>
            <Button onClick={handleSave} disabled={save.isPending}><Save className="h-4 w-4 ml-1" /> حفظ</Button>
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
