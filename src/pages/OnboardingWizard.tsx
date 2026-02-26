
import { useState } from 'react';
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

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Company info
  const [company, setCompany] = useState({ website: '', tax_number: '', logo_url: '' });
  // Step 2: Employee
  const [employee, setEmployee] = useState({ full_name: '', phone: '', email: '', position: '' });
  // Step 3: Customer
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', nationality: '' });
  // Step 4: Booking
  const [booking, setBooking] = useState({
    customer_name: '', hotel_name: '', destination_city: '',
    check_in_date: '', check_out_date: '',
  });

  const finishOnboarding = async () => {
    if (!orgId) return;
    try {
      await supabase
        .from('organizations')
        .update({ onboarding_completed: true })
        .eq('id', orgId);
      toast.success('🎉 مرحباً بك! تم إعداد النظام بنجاح');
      window.location.href = '/dashboard';
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleSkipAll = async () => {
    await finishOnboarding();
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (currentStep === 0) {
        // Update org info
        if (company.website || company.tax_number) {
          await supabase
            .from('organizations')
            .update({
              website: company.website || null,
              tax_number: company.tax_number || null,
              logo_url: company.logo_url || null,
            })
            .eq('id', orgId);
        }
      } else if (currentStep === 1) {
        // Add employee
        if (employee.full_name.trim()) {
          const code = 'EMP-' + Date.now().toString().slice(-6);
          await supabase.from('employees').insert({
            full_name: employee.full_name.trim(),
            phone: employee.phone || null,
            email: employee.email || null,
            position: employee.position || null,
            employee_code: code,
            organization_id: orgId,
          });
        }
      } else if (currentStep === 2) {
        // Add customer
        if (customer.name.trim()) {
          await supabase.from('customers').insert({
            name: customer.name.trim(),
            phone: customer.phone || null,
            email: customer.email || null,
            nationality: customer.nationality || null,
            organization_id: orgId,
          });
        }
      } else if (currentStep === 3) {
        // Add booking
        if (booking.customer_name.trim() && booking.check_in_date && booking.check_out_date) {
          await supabase.from('hotel_bookings').insert({
            customer_name: booking.customer_name.trim(),
            hotel_name: booking.hotel_name || null,
            destination_city: booking.destination_city || null,
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            organization_id: orgId,
          });
        }
        await finishOnboarding();
        return;
      }

      setCurrentStep(prev => prev + 1);
    } catch (error: any) {
      console.error('Onboarding step error:', error);
      // Don't block progression on non-critical errors
      if (currentStep < 3) {
        setCurrentStep(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkipStep = () => {
    if (currentStep === 3) {
      finishOnboarding();
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
            {currentStep === 3 && 'أنشئ أول حجز فندقي'}
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

          {/* Step 4: Booking */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم العميل *</Label>
                <Input
                  value={booking.customer_name}
                  onChange={e => setBooking(p => ({ ...p, customer_name: e.target.value }))}
                  placeholder="اسم العميل"
                  className="text-right"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>اسم الفندق</Label>
                  <Input
                    value={booking.hotel_name}
                    onChange={e => setBooking(p => ({ ...p, hotel_name: e.target.value }))}
                    placeholder="فندق..."
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Input
                    value={booking.destination_city}
                    onChange={e => setBooking(p => ({ ...p, destination_city: e.target.value }))}
                    placeholder="شرم الشيخ"
                    className="text-right"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>تاريخ الدخول *</Label>
                  <Input
                    type="date"
                    value={booking.check_in_date}
                    onChange={e => setBooking(p => ({ ...p, check_in_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الخروج *</Label>
                  <Input
                    type="date"
                    value={booking.check_out_date}
                    onChange={e => setBooking(p => ({ ...p, check_out_date: e.target.value }))}
                  />
                </div>
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
                disabled={loading}
                className="bg-gradient-to-r from-primary to-blue-700 text-primary-foreground"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                ) : currentStep === 3 ? (
                  <>
                    إنهاء الإعداد
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
