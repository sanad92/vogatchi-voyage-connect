import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import { Building2, Palette, Phone, Save, Upload, Loader2 } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

const OrganizationSettingsTab = () => {
  const orgId = useOrgId();
  const { settings, isLoading, saveSettings, isSaving } = useOrganizationSettings();
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    company_name_ar: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    tax_number: '',
    commercial_register: '',
    footer_text: '',
    currency: 'EGP',
    primary_color: '#3b82f6',
    secondary_color: '#6366f1',
    accent_color: '#f59e0b',
    logo_url: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || '',
        company_name_ar: settings.company_name_ar || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        address: settings.address || '',
        tax_number: settings.tax_number || '',
        commercial_register: settings.commercial_register || '',
        footer_text: settings.footer_text || '',
        currency: settings.currency || 'EGP',
        primary_color: settings.primary_color || '#3b82f6',
        secondary_color: settings.secondary_color || '#6366f1',
        accent_color: settings.accent_color || '#f59e0b',
        logo_url: settings.logo_url || '',
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${orgId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(path);

      setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success('تم رفع الشعار بنجاح');
    } catch (err: any) {
      toast.error('فشل رفع الشعار: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    saveSettings(form);
  };

  if (isLoading) return <LoadingSkeleton variant="card" count={3} />;

  return (
    <div className="space-y-6">
      {/* بيانات المؤسسة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="h-5 w-5 text-primary" />
            بيانات المؤسسة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Upload className="h-4 w-4 ml-1" />}
                    {uploading ? 'جاري الرفع...' : 'رفع الشعار'}
                  </span>
                </Button>
              </Label>
              <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG أو SVG (حد أقصى 2MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الشركة (إنجليزي)</Label>
              <Input value={form.company_name} onChange={e => handleChange('company_name', e.target.value)} placeholder="Company Name" />
            </div>
            <div className="space-y-2">
              <Label>اسم الشركة (عربي)</Label>
              <Input value={form.company_name_ar} onChange={e => handleChange('company_name_ar', e.target.value)} placeholder="اسم الشركة" dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>الرقم الضريبي</Label>
              <Input value={form.tax_number} onChange={e => handleChange('tax_number', e.target.value)} placeholder="Tax Number" />
            </div>
            <div className="space-y-2">
              <Label>السجل التجاري</Label>
              <Input value={form.commercial_register} onChange={e => handleChange('commercial_register', e.target.value)} placeholder="Commercial Register" />
            </div>
            <div className="space-y-2">
              <Label>العملة الافتراضية</Label>
              <Input value={form.currency} onChange={e => handleChange('currency', e.target.value)} placeholder="EGP" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* بيانات التواصل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Phone className="h-5 w-5 text-primary" />
            بيانات التواصل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+20 xxx xxx xxxx" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="info@company.com" dir="ltr" type="email" />
            </div>
            <div className="space-y-2">
              <Label>الموقع الإلكتروني</Label>
              <Input value={form.website} onChange={e => handleChange('website', e.target.value)} placeholder="https://company.com" dir="ltr" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>العنوان</Label>
              <Textarea value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="عنوان المؤسسة" rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>نص التذييل (يظهر في الفواتير)</Label>
              <Textarea value={form.footer_text} onChange={e => handleChange('footer_text', e.target.value)} placeholder="شكراً لتعاملكم معنا" rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الألوان */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Palette className="h-5 w-5 text-primary" />
            ألوان العلامة التجارية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>اللون الرئيسي</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={e => handleChange('primary_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" />
                <Input value={form.primary_color} onChange={e => handleChange('primary_color', e.target.value)} className="flex-1" dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>اللون الثانوي</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondary_color} onChange={e => handleChange('secondary_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" />
                <Input value={form.secondary_color} onChange={e => handleChange('secondary_color', e.target.value)} className="flex-1" dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>لون التمييز</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent_color} onChange={e => handleChange('accent_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" />
                <Input value={form.accent_color} onChange={e => handleChange('accent_color', e.target.value)} className="flex-1" dir="ltr" />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
            <p className="text-sm text-muted-foreground mb-2">معاينة الألوان:</p>
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-lg shadow-sm" style={{ backgroundColor: form.primary_color }} />
              <div className="w-12 h-12 rounded-lg shadow-sm" style={{ backgroundColor: form.secondary_color }} />
              <div className="w-12 h-12 rounded-lg shadow-sm" style={{ backgroundColor: form.accent_color }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
};

export default OrganizationSettingsTab;
