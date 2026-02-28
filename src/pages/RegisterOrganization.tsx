
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, ArrowLeft, SkipForward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  // If user already has an organization, redirect to dashboard
  if (!orgLoading && hasOrganization) {
    return <Navigate to="/dashboard" replace />;
  }

  const createViaRpcFallback = async (params: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  }) => {
    const { data: insertedOrg, error: orgError } = await supabase.rpc('create_organization_onboarding', {
      _name: params.name,
      _slug: '',
      _phone: params.phone,
      _email: params.email,
      _address: params.address,
    });

    if (orgError || !insertedOrg) {
      throw orgError || new Error('Failed to create organization');
    }

    return insertedOrg as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!user?.id || !trimmedName) return;

    setLoading(true);
    try {
      const organizationEmail = form.email.trim() || user.email || null;
      let organizationId: string | null = null;

      const { data: onboardingResult, error: onboardingError } = await supabase.functions.invoke('create-organization-onboarding', {
        body: {
          name: trimmedName,
          phone: form.phone || null,
          email: organizationEmail,
          address: form.address || null,
        },
      });

      if (!onboardingError && onboardingResult?.organizationId) {
        organizationId = onboardingResult.organizationId as string;
      } else {
        const failedToSend = String(onboardingError?.message || '').toLowerCase().includes('failed to send a request');

        if (failedToSend) {
          organizationId = await createViaRpcFallback({
            name: trimmedName,
            email: organizationEmail,
            phone: form.phone || null,
            address: form.address || null,
          });
        } else {
          throw onboardingError;
        }
      }

      if (!organizationId) {
        throw new Error('Failed to create organization');
      }

      toast.success('تم إنشاء المؤسسة بنجاح! 🎉');
      await refetchOrganization();
      
      // Trigger welcome email (non-blocking)
      supabase.functions.invoke('send-welcome-email', {
        body: { organizationName: form.name.trim() },
      }).catch(() => {/* non-critical */});
      
      // Redirect to dashboard after onboarding transaction completes
      setTimeout(() => {
        window.location.href = onboardingResult?.redirectTo || '/dashboard';
      }, 500);

    } catch (error: any) {
      console.error('Error creating organization:', error);
      const message = String(error?.message || '').toLowerCase();
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
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-background to-indigo-50 flex items-center justify-center p-4" dir="rtl">
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
              disabled={loading}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-phone">رقم الهاتف</Label>
            <Input
              id="org-phone"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
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
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
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
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
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
        </form>
      </div>
    </div>
  );
};

export default RegisterOrganization;
