
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import {
  clearOnboardingRecordIds, completeOnboarding, loadCompanySetup, onboardingRecordId,
  saveCompanySetup, saveOnboardingCustomer, saveOnboardingEmployee,
  type CompanySetup, type OnboardingIdentity,
} from '@/lib/onboarding';
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

const OnboardingWizard = () => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  if (!orgId || !user?.id) {
    return <div className="p-8 text-center" role="status" dir="rtl">جارٍ تحميل بيانات الشركة…</div>;
  }
  // Discard form state and pending UI callbacks when the company/user changes.
  return <OrganizationOnboarding key={`${orgId}:${user.id}`} orgId={orgId} userId={user.id} />;
};

const OrganizationOnboarding = ({ orgId, userId }: OnboardingIdentity) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useSupabasePermissions();
  const identity = { orgId, userId };
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const busy = useRef(false);
  const active = useRef(true);
  useLayoutEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const [company, setCompany] = useState<CompanySetup | null>(null);
  const [employee, setEmployee] = useState({ full_name: '', phone: '', email: '', position: '' });
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', nationality: '' });
  const companyQuery = useQuery({
    queryKey: ['onboarding-company-settings', orgId, userId],
    queryFn: () => loadCompanySetup(supabase, { orgId, userId }),
  });
  useEffect(() => {
    // Populate once; a background refresh must not overwrite the user's edits.
    if (company === null && companyQuery.isSuccess && !companyQuery.isFetching) setCompany(companyQuery.data);
  }, [company, companyQuery.isSuccess, companyQuery.isFetching, companyQuery.data]);

  const canSaveStep = currentStep === 1 ? hasPermission('employees_create')
    : currentStep === 2 ? hasPermission('customers_create') : true;
  const canStartBooking = hasPermission('bookings_create');
  const companyUnavailable = currentStep === 0 && company === null;

  const runAction = async (action: () => Promise<void>, failureMessage: string) => {
    // State updates alone do not prevent two clicks in the same render.
    if (busy.current || !active.current) return;
    busy.current = true;
    setLoading(true);
    setSaveError(null);
    try {
      await action();
    } catch {
      if (active.current) {
        setSaveError(failureMessage);
        toast.error(failureMessage);
      }
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  };

  const finishOnboarding = async (destination: string) => {
    await completeOnboarding(supabase, identity);
    if (!active.current) return;
    // Cleanup is best effort; storage failure must not undo confirmed completion.
    try { clearOnboardingRecordIds(sessionStorage, identity); } catch { /* IDs contain no form data. */ }
    queryClient.setQueryData(['onboarding-status', orgId], false);
    toast.success('تم إنهاء الإعداد بنجاح');
    navigate(destination, { replace: true });
  };

  const handleSkipAll = () => runAction(
    () => finishOnboarding('/dashboard'),
    'تعذر إنهاء الإعداد. تحقق من الاتصال وصلاحية إدارة الشركة ثم أعد المحاولة.',
  );

  const handleNext = () => {
    if (!canSaveStep || companyUnavailable) return;
    if ((currentStep === 1 && !employee.full_name.trim()) || (currentStep === 2 && !customer.name.trim())) {
      setSaveError('اكتب الاسم للمتابعة أو اختر تخطي هذه الخطوة.');
      return;
    }
    return runAction(async () => {
      if (currentStep === 0) {
        await saveCompanySetup(supabase, identity, company!);
        if (!active.current) return;
        queryClient.setQueryData(['onboarding-company-settings', orgId, userId], company);
        void queryClient.invalidateQueries({ queryKey: ['organization-settings', orgId] });
      } else if (currentStep === 1) {
        await saveOnboardingEmployee(supabase, identity, employee, onboardingRecordId(sessionStorage, identity, 'employee'));
        if (!active.current) return;
        void queryClient.invalidateQueries({ queryKey: ['employees'] });
      } else if (currentStep === 2) {
        await saveOnboardingCustomer(supabase, identity, customer, onboardingRecordId(sessionStorage, identity, 'customer'));
        if (!active.current) return;
        void queryClient.invalidateQueries({ queryKey: ['customers'] });
      } else if (currentStep === 3) {
        await finishOnboarding(canStartBooking ? '/bookings/new' : '/dashboard');
        return;
      }
      if (active.current) setCurrentStep(prev => prev + 1);
    }, currentStep === 3
      ? 'تعذر إنهاء الإعداد. تحقق من الاتصال وصلاحية إدارة الشركة ثم أعد المحاولة.'
      : 'لم يتم تأكيد الحفظ. بياناتك باقية في هذه الخطوة؛ تحقق من الاتصال والصلاحيات ثم أعد المحاولة.');
  };

  const handleSkipStep = () => {
    if (busy.current || !active.current) return;
    setSaveError(null);
    if (currentStep === 3) {
      return handleSkipAll();
    } else {
      setCurrentStep(prev => prev + 1);
    }
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
            {currentStep === 3 && 'ابدأ حجزك الأول من نموذج الحجز الكامل'}
          </p>

          {saveError && <p role="alert" className="mb-4 text-sm text-destructive">{saveError}</p>}
          {currentStep === 0 && companyQuery.isError && company === null && (
            <div role="alert" className="mb-4 space-y-2 text-sm text-destructive">
              <p>تعذر تحميل إعدادات الشركة الحالية. أعد المحاولة قبل تعديلها.</p>
              <Button variant="outline" size="sm" disabled={loading || companyQuery.isFetching} onClick={() => { void companyQuery.refetch(); }}>إعادة المحاولة</Button>
            </div>
          )}
          {companyUnavailable && !companyQuery.isError && <p role="status" className="mb-4 text-sm">جارٍ تحميل إعدادات الشركة…</p>}
          {!canSaveStep && <p role="status" className="mb-4 text-sm text-muted-foreground">إضافة هذا السجل تحتاج صلاحية من مسؤول الشركة. يمكنك تخطي الخطوة.</p>}

          <fieldset className="min-w-0" disabled={loading || companyUnavailable || !canSaveStep}>
          {/* Step 1: Company */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الموقع الإلكتروني</Label>
                <Input
                  value={company?.website ?? ''}
                  onChange={e => setCompany(p => ({ tax_number: p?.tax_number ?? '', website: e.target.value }))}
                  placeholder="https://example.com"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>الرقم الضريبي</Label>
                <Input
                  value={company?.tax_number ?? ''}
                  onChange={e => setCompany(p => ({ website: p?.website ?? '', tax_number: e.target.value }))}
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

          {/* Step 4 uses the same complete booking flow as the rest of the app. */}
          {currentStep === 3 && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <p>في نموذج الحجز ستختار العميل والخدمات والموردين، وتراجع التواريخ والأسعار والتكاليف قبل الحفظ.</p>
              <p className="text-muted-foreground">
                {canStartBooking
                  ? 'اضغط «فتح نموذج الحجز» لإنهاء الإعداد والبدء. يمكنك أيضاً تخطي الحجز الآن.'
                  : 'يمكنك إنهاء الإعداد الآن. إنشاء الحجز يحتاج صلاحية من مسؤول الشركة.'}
              </p>
            </div>
          )}
          </fieldset>

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
                  onClick={handleSkipAll}
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
                  onClick={() => { if (!busy.current) { setSaveError(null); setCurrentStep(prev => prev - 1); } }}
                  disabled={loading}
                >
                  <ChevronRight className="w-4 h-4 ml-1" />
                  السابق
                </Button>
              )}
              <Button
                onClick={handleNext}
                size="sm"
                disabled={loading || companyUnavailable || !canSaveStep}
                className="bg-gradient-to-r from-primary to-blue-700 text-primary-foreground"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                ) : currentStep === 3 ? (
                  <>
                    {canStartBooking ? 'فتح نموذج الحجز' : 'إنهاء الإعداد'}
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

export default OnboardingWizard;
