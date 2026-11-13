
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Building2, UserPlus, Users, CalendarPlus, 
  ChevronLeft, ChevronRight, Check, SkipForward,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'company', title: 'بيانات الشركة', titleShort: 'الشركة', icon: Building2 },
  { id: 'employee', title: 'أول موظف', titleShort: 'موظف', icon: UserPlus },
  { id: 'customer', title: 'أول عميل', titleShort: 'عميل', icon: Users },
  { id: 'booking', title: 'أول حجز', titleShort: 'حجز', icon: CalendarPlus },
];

const OrganizationOnboarding = ({ orgId }: { orgId: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submitting = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const { user } = useOptimizedAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Company info
  const [company, setCompany] = useState({ website: '', tax_number: '' });
  // Step 2: Employee
  const [employee, setEmployee] = useState({ full_name: '', phone: '', email: '', position: '' });
  // Step 3: Customer
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', nationality: '' });
  const [employeeCode] = useState(() => `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
  const [customerId] = useState(() => crypto.randomUUID());

  const runStep = async (operation: () => Promise<void>) => {
    if (submitting.current || !orgId || !user) return;
    submitting.current = true;
    setLoading(true);
    try {
      await operation();
    } catch (error) {
      if (mounted.current) {
        const detail = error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : undefined;
        toast.error('تعذر حفظ خطوة الإعداد', { description: detail });
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  const finishOnboarding = (destination: '/dashboard' | '/bookings/new') => runStep(async () => {
    const { data, error } = await supabase.from('organizations')
      .update({ onboarding_completed: true }).eq('id', orgId).select('id').single();
    if (error) throw error;
    if (!data) throw new Error('تعذر تأكيد اكتمال إعداد المؤسسة.');
    queryClient.setQueryData(['onboarding-status', orgId], false);
    if (mounted.current) {
      toast.success('تم إعداد المؤسسة بنجاح');
      navigate(destination, { replace: true });
    }
  });

  const handleNext = () => {
    if (currentStep === 3) return finishOnboarding('/bookings/new');
    return runStep(async () => {
      if (currentStep === 0) {
        const website = company.website.trim();
        const taxNumber = company.tax_number.trim();
        if (website || taxNumber) {
          const { error } = await supabase.from('organization_settings').upsert({
            organization_id: orgId,
            ...(website && { website }),
            ...(taxNumber && { tax_number: taxNumber }),
          }, { onConflict: 'organization_id' });
          if (error) throw error;
          if (taxNumber) {
            const { error: taxError } = await supabase.from('organizations')
              .update({ tax_number: taxNumber }).eq('id', orgId).select('id').single();
            if (taxError) throw taxError;
          }
          void queryClient.invalidateQueries({ queryKey: ['organization-settings', orgId] });
        }
      } else if (currentStep === 1) {
        if (!employee.full_name.trim()) throw new Error('أدخل اسم الموظف أو تخطَّ الخطوة.');
        const { error } = await supabase.from('employees').upsert({
          full_name: employee.full_name.trim(),
          phone: employee.phone.trim() || null,
          email: employee.email.trim() || null,
          position: employee.position.trim() || null,
          employee_code: employeeCode,
          organization_id: orgId,
        }, { onConflict: 'employee_code', ignoreDuplicates: true });
        if (error) throw error;
        void queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
      } else {
        if (!customer.name.trim()) throw new Error('أدخل اسم العميل أو تخطَّ الخطوة.');
        const { error } = await supabase.from('customers').upsert({
          id: customerId,
          name: customer.name.trim(),
          phone: customer.phone.trim() || null,
          email: customer.email.trim() || null,
          nationality: customer.nationality.trim() || null,
          organization_id: orgId,
          created_by: user!.id,
        }, { onConflict: 'id', ignoreDuplicates: true });
        if (error) throw error;
        void queryClient.invalidateQueries({ queryKey: ['customers', orgId] });
      }
      if (mounted.current) setCurrentStep(step => step + 1);
    });
  };

  const handleSkipStep = () => {
    if (currentStep === 3) return finishOnboarding('/dashboard');
    setCurrentStep(step => step + 1);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-background to-indigo-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Rocket className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">إعداد النظام</h1>
          <p className="text-muted-foreground text-sm mt-1">أكمل هذه الخطوات لبدء استخدام النظام بسهولة</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                    isDone && 'bg-primary border-primary text-primary-foreground',
                    isActive && 'border-primary bg-primary/10 text-primary',
                    !isDone && !isActive && 'border-muted text-muted-foreground bg-muted/30'
                  )}>
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    'text-xs mt-1 font-medium',
                    isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.titleShort}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-to-l from-primary to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {STEPS[currentStep].title}
          </h2>
          <p className="text-muted-foreground text-sm mb-5">
            {currentStep === 0 && 'أضف معلومات إضافية عن شركتك'}
            {currentStep === 1 && 'سجّل أول موظف في النظام'}
            {currentStep === 2 && 'أضف أول عميل لشركتك'}
            {currentStep === 3 && 'انتقل إلى شاشة الحجز الموحّد لإضافة أول حجز.'}
          </p>

          {/* Step 1: Company */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الموقع الإلكتروني</Label>
                <Input
                  value={company.website}
                  onChange={e => setCompany(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>الرقم الضريبي</Label>
                <Input
                  value={company.tax_number}
                  onChange={e => setCompany(p => ({ ...p, tax_number: e.target.value }))}
                  placeholder="الرقم الضريبي للشركة"
                  className="text-right"
                />
              </div>
            </div>
          )}

          {/* Step 2: Employee */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الموظف *</Label>
                <Input
                  value={employee.full_name}
                  onChange={e => setEmployee(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="الاسم الكامل"
                  className="text-right"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>الهاتف</Label>
                  <Input
                    value={employee.phone}
                    onChange={e => setEmployee(p => ({ ...p, phone: e.target.value }))}
                    placeholder="01xxxxxxxxx"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد</Label>
                  <Input
                    value={employee.email}
                    onChange={e => setEmployee(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@company.com"
                    className="text-right"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>المسمى الوظيفي</Label>
                <Input
                  value={employee.position}
                  onChange={e => setEmployee(p => ({ ...p, position: e.target.value }))}
                  placeholder="مثال: مسؤول حجوزات"
                  className="text-right"
                />
              </div>
            </div>
          )}

          {/* Step 3: Customer */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم العميل *</Label>
                <Input
                  value={customer.name}
                  onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))}
                  placeholder="الاسم الكامل"
                  className="text-right"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>الهاتف</Label>
                  <Input
                    value={customer.phone}
                    onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))}
                    placeholder="01xxxxxxxxx"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد</Label>
                  <Input
                    value={customer.email}
                    onChange={e => setCustomer(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="text-right"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الجنسية</Label>
                <Input
                  value={customer.nationality}
                  onChange={e => setCustomer(p => ({ ...p, nationality: e.target.value }))}
                  placeholder="مصري"
                  className="text-right"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipStep}
                disabled={loading}
                className="text-muted-foreground"
              >
                <SkipForward className="w-4 h-4 ml-1" />
                تخطي
              </Button>
              {currentStep === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void finishOnboarding('/dashboard')}
                  disabled={loading}
                  className="text-muted-foreground"
                >
                  تخطي الكل
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={loading}
                >
                  <ChevronRight className="w-4 h-4 ml-1" />
                  السابق
                </Button>
              )}
              <Button
                onClick={handleNext}
                size="sm"
                disabled={loading || !orgId}
                className="bg-gradient-to-r from-primary to-blue-700 text-primary-foreground"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                ) : currentStep === 3 ? (
                  <>
                    إنشاء أول حجز
                    <Check className="w-4 h-4 mr-1" />
                  </>
                ) : (
                  <>
                    التالي
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function OnboardingWizard() {
  const orgId = useOrgId();
  return orgId ? <OrganizationOnboarding key={orgId} orgId={orgId} /> : null;
}
