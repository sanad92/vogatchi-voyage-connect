import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Palette, Save } from 'lucide-react';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';

export default function WhiteLabelPage() {
  const { data, save } = useWhiteLabel();
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" /> الهوية البصرية</h1>
        <p className="text-sm text-muted-foreground">تخصيص شعار وألوان مؤسستك</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">المعلومات الأساسية</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>اسم العلامة</Label><Input value={form.brand_name ?? ''} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} /></div>
            <div><Label>رابط الشعار</Label><Input value={form.logo_url ?? ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>رابط الأيقونة (Favicon)</Label><Input value={form.favicon_url ?? ''} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>اللون الأساسي</Label><Input type="color" value={form.primary_color ?? '#7c3aed'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div>
              <div><Label>لون التمييز</Label><Input type="color" value={form.accent_color ?? '#f59e0b'} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} /></div>
            </div>
            <div><Label>النطاق المخصص</Label><Input value={form.custom_domain ?? ''} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} placeholder="app.example.com" /></div>
            <div><Label>اسم مرسل الإيميلات</Label><Input value={form.email_from_name ?? ''} onChange={(e) => setForm({ ...form, email_from_name: e.target.value })} /></div>
            <div><Label>إيميل الدعم</Label><Input type="email" value={form.support_email ?? ''} onChange={(e) => setForm({ ...form, support_email: e.target.value })} /></div>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}><Save className="h-4 w-4 ml-1" /> حفظ</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">معاينة</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border p-6 space-y-4" style={{ background: '#fff' }}>
              {form.logo_url && <img src={form.logo_url} alt="logo" className="h-10" />}
              <div className="text-2xl font-bold" style={{ color: form.primary_color }}>{form.brand_name || 'اسم علامتك'}</div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded text-white text-sm" style={{ background: form.primary_color }}>زر أساسي</button>
                <button className="px-4 py-2 rounded text-white text-sm" style={{ background: form.accent_color }}>زر تمييز</button>
              </div>
              {form.support_email && <div className="text-xs text-muted-foreground">الدعم: {form.support_email}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
