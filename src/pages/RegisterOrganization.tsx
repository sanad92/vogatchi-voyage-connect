import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RegisterOrganization = () => {
  const { user } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading, refetchOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  if (!orgLoading && hasOrganization) {
    return <Navigate to="/dashboard" replace />;
  }

  const skipStorageKey = user?.id ? `org_setup_skipped_${user.id}` : null;

  const handleSkip = () => {
    if (skipStorageKey) {
      localStorage.setItem(skipStorageKey, 'true');
    }
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    if (!user?.id || !trimmedName) return;

    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData?.session?.access_token) {
        toast.error('جلسة الدخول انتهت. من فضلك سجل دخول مرة أخرى.');
        navigate('/login');
        return;
      }

      const accessToken = sessionData.session.access_token;
      const organizationEmail = form.email.trim() || user.email || null;

      const { data: onboardingResult, error: onboardingError } = await supabase.functions.invoke(
        'create-organization-onboarding',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            name: trimmedName,
            phone: form.phone.trim() || null,
            email: organizationEmail,
            address: form.address.trim() || null,
          },
        }
      );

      if (onboardingError || !onboardingResult?.organizationId) {
        throw onboardingError || new Error('Failed to create organization');
      }

      if (skipStorageKey) {
        localStorage.removeItem(skipStorageKey);
      }

      toast.success('تم إنشاء المؤسسة بنجاح');
      await refetchOrganization();

      void supabase.functions
        .invoke('send-welcome-email', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: { organizationName: trimmedName },
        })
        .catch(() => {
          // Non-blocking follow-up action.
        });

      const targetPath =
        typeof onboardingResult.redirectTo === 'string'
          ? onboardingResult.redirectTo
          : '/dashboard';

      navigate(targetPath, { replace: true });
    } catch (submitError: unknown) {
      console.error('Error creating organization:', submitError);

      const message =
        submitError instanceof Error ? submitError.message.toLowerCase() : '';

      if (
        message.includes('401') ||
        message.includes('unauthorized') ||
        message.includes('invalid auth')
      ) {
        toast.error('غير مصرح. من فضلك سجل دخول مرة أخرى ثم أعد المحاولة.');
        navigate('/login');
        return;
      }

      if (message.includes('rls') || message.includes('permission')) {
        toast.error('لا توجد صلاحية كافية لإكمال إنشاء المؤسسة. جرّب تسجيل الدخول من جديد.');
      } else {
        toast.error('حدث خطأ أثناء إنشاء المؤسسة');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-bl from-blue-50 via-background to-indigo-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">أنشئ مؤسستك</h1>
          <p className="text-muted-foreground">أدخل بيانات شركة السياحة الخاصة بك للبدء</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="org-name">اسم الشركة *</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm((previous) => ({ ...previous, name: e.target.value }))}
              placeholder="مثال: شركة النيل للسياحة"
              required
              disabled={loading}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-phone">رقم الهاتف</Label>
            <Input
              id="org-phone"
              value={form.phone}
              onChange={(e) => setForm((previous) => ({ ...previous, phone: e.target.value }))}
              placeholder="01xxxxxxxxx"
              disabled={loading}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-email">البريد الإلكتروني للشركة</Label>
            <Input
              id="org-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((previous) => ({ ...previous, email: e.target.value }))}
              placeholder="info@company.com"
              disabled={loading}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-address">العنوان</Label>
            <Input
              id="org-address"
              value={form.address}
              onChange={(e) => setForm((previous) => ({ ...previous, address: e.target.value }))}
              placeholder="المدينة - الحي - الشارع"
              disabled={loading}
              className="text-right"
            />
          </div>

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

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
            >
              <SkipForward className="w-4 h-4" />
              تخطي والدخول للوحة التحكم
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              يمكنك استكمال بيانات المؤسسة لاحقًا من الإعدادات
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterOrganization;
