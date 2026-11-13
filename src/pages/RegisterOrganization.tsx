
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { contactValidationError, normalizeContactPhone, validContactName } from '@/lib/organizationContacts';

const RegisterOrganization = () => {
  const { user, profile } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading, refetchOrganization } = useOrganization();
  const { dir } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ownerName, setOwnerName] = useState<string>();
  const [companyEmail, setCompanyEmail] = useState<string>();
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    ownerPhone: '',
    address: '',
  });
  const accountName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const contactName = ownerName ?? (profile?.full_name || accountName);
  const email = companyEmail ?? user?.email ?? '';

  // If user already has an organization, redirect to dashboard
  if (!orgLoading && hasOrganization) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!user?.id || loading) return;
    if (!validContactName(trimmedName)) {
      toast.error('أدخل اسم المؤسسة من حرفين إلى 120 حرفًا.');
      return;
    }
    const validation = contactValidationError(contactName, form.ownerPhone, form.phone, email);
    if (validation) {
      toast.error(validation);
      return;
    }

    setLoading(true);
    try {
      const { data: organizationId, error } = await supabase.rpc('create_organization_onboarding', {
        _name: trimmedName,
        _owner_name: contactName.trim(),
        _owner_phone: normalizeContactPhone(form.ownerPhone)!,
        _phone: normalizeContactPhone(form.phone)!,
        _email: email.trim(),
        _address: form.address.trim() || undefined,
      });
      if (error) {
        if (['22023', '42501', 'P0001'].includes(error.code) && /[\u0600-\u06ff]/.test(error.message)) {
          toast.error(error.message);
          return;
        }
        throw error;
      }

      if (!organizationId) {
        throw new Error('Failed to create organization');
      }

      toast.success('تم إنشاء المؤسسة بنجاح! 🎉');
      localStorage.removeItem('org_setup_skipped');
      await refetchOrganization();
      
      // Trigger welcome email (non-blocking)
      supabase.functions.invoke('send-welcome-email', {
        body: { organizationName: form.name.trim() },
      }).catch(() => {/* non-critical */});
      
      navigate('/dashboard', { replace: true });

    } catch (error: unknown) {
      console.error('Error creating organization:', error);
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('rls') || message.includes('permission')) {
        toast.error('لا توجد صلاحية كافية لإكمال إنشاء المؤسسة. يرجى إعادة تسجيل الدخول.');
      } else {
        toast.error('حدث خطأ أثناء إنشاء المؤسسة');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-background to-indigo-50 flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">أنشئ مؤسستك</h1>
          <p className="text-muted-foreground">أدخل بيانات شركة السياحة الخاصة بك للبدء</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border space-y-5">
          <div className="space-y-2">
            <Label htmlFor="org-name">اسم الشركة *</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: شركة النيل للسياحة"
              required
              maxLength={120}
              autoComplete="organization"
              disabled={loading}
              className="text-start"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-phone">هاتف المؤسسة *</Label>
            <Input
              id="org-phone"
              type="tel"
              dir="ltr"
              required
              maxLength={32}
              autoComplete="section-company tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="01xxxxxxxxx"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-email">البريد الإلكتروني للشركة *</Label>
            <Input
              id="org-email"
              type="email"
              dir="ltr"
              required
              maxLength={255}
              autoComplete="section-company email"
              value={email}
              onChange={e => setCompanyEmail(e.target.value)}
              placeholder="info@company.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-address">العنوان</Label>
            <Input
              id="org-address"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="المدينة - الحي - الشارع"
              disabled={loading}
              maxLength={500}
              className="text-start"
            />
          </div>

          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">مسؤول المؤسسة</legend>
            <div className="space-y-2">
              <Label htmlFor="org-owner-name">اسم مسؤول المؤسسة *</Label>
              <Input id="org-owner-name" autoComplete="name" value={contactName} onChange={e => setOwnerName(e.target.value)} required maxLength={120} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-owner-phone">موبايل مسؤول المؤسسة *</Label>
              <Input id="org-owner-phone" type="tel" dir="ltr" autoComplete="section-owner tel" required maxLength={32} value={form.ownerPhone} onChange={e => setForm(f => ({ ...f, ownerPhone: e.target.value }))} disabled={loading} />
            </div>
            {user?.email && <p className="break-all text-xs text-muted-foreground"><span>بريد حساب المسؤول</span> <bdi data-no-translate>{user.email}</bdi></p>}
          </fieldset>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            disabled={loading || !form.name.trim()}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                جاري الإنشاء...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                إنشاء المؤسسة والبدء
                <ArrowLeft className="w-4 h-4" />
              </div>
            )}
          </Button>

        </form>
      </div>
    </div>
  );
};

export default RegisterOrganization;
