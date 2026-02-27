
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, ArrowLeft } from 'lucide-react';

const RegisterOrganization = () => {
  const { user } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();
  const [loading, setLoading] = useState(false);
  
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


  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || `org-${Date.now()}`;
  };

  const generateShortSuffix = () => {
    return Math.random().toString(36).slice(2, 6);
  };

  const buildSlugCandidate = (baseSlug: string, attempt: number) => {
    if (attempt === 0) return baseSlug;
    return `${baseSlug}-${generateShortSuffix()}`;
  };

  const isDuplicateConstraintError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();
    return (
      code === '23505' ||
      message.includes('unique') ||
      message.includes('duplicate key') ||
      message.includes('slug')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!user?.id || !trimmedName) return;

    setLoading(true);
    try {
      const baseSlug = generateSlug(trimmedName);
      const organizationEmail = form.email.trim() || user.email || null;

      let org: { id: string } | null = null;
      let lastOrgError: any = null;

      // Create organization with retry strategy for unique slug collisions
      for (let attempt = 0; attempt < 6; attempt++) {
        const slugCandidate = buildSlugCandidate(baseSlug, attempt);

        const { data: insertedOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: trimmedName,
            slug: slugCandidate,
            phone: form.phone || null,
            email: organizationEmail,
            address: form.address || null,
          })
          .select('id')
          .single();

        if (!orgError && insertedOrg) {
          org = insertedOrg;
          break;
        }

        if (isDuplicateConstraintError(orgError)) {
          lastOrgError = orgError;
          continue;
        }

        throw orgError;
      }

      if (!org) {
        if (isDuplicateConstraintError(lastOrgError)) {
          toast.error('تعذر إنشاء المؤسسة حالياً رغم توليد معرف فريد تلقائياً. يرجى إعادة المحاولة.');
          return;
        }
        throw lastOrgError || new Error('Failed to create organization');
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
          is_active: true,
        });

      if (memberError) throw memberError;

      // Trial subscription is auto-assigned via database trigger

      toast.success('تم إنشاء المؤسسة بنجاح! 🎉');
      
      // Trigger welcome email (non-blocking)
      supabase.functions.invoke('send-welcome-email', {
        body: { organizationName: form.name.trim() },
      }).catch(() => {/* non-critical */});
      
      // Redirect to onboarding wizard
      setTimeout(() => {
        window.location.href = '/onboarding';
      }, 500);

    } catch (error: any) {
      console.error('Error creating organization:', error);
      const message = String(error?.message || '').toLowerCase();
      if (isDuplicateConstraintError(error)) {
        toast.error('اسم المؤسسة أو المعرف الخاص بها مستخدم مسبقاً. تم إنشاء معرف بديل تلقائياً، يرجى إعادة المحاولة.');
      } else if (message.includes('rls') || message.includes('permission')) {
        toast.error('لا توجد صلاحية كافية لإكمال إنشاء المؤسسة. يرجى إعادة تسجيل الدخول.');
      } else if (message) {
        toast.error(error.message);
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
