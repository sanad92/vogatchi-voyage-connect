
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDemoData } from '@/hooks/useDemoData';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, ArrowLeft } from 'lucide-react';

const RegisterOrganization = () => {
  const { user } = useOptimizedAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { generateDemoData } = useDemoData();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || `org-${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !form.name.trim()) return;

    setLoading(true);
    try {
      const slug = generateSlug(form.name);

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: form.name.trim(),
          slug,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (orgError) throw orgError;

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

      // Generate demo data in background
      generateDemoData(org.id);

      toast.success('تم إنشاء المؤسسة بنجاح! 🎉');
      
      // Redirect to onboarding wizard
      setTimeout(() => {
        window.location.href = '/onboarding';
      }, 500);

    } catch (error: any) {
      console.error('Error creating organization:', error);
      if (error.message?.includes('unique')) {
        toast.error('اسم المؤسسة مستخدم مسبقاً');
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
