import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  CreditCard, ArrowRight, Shield, Clock, CheckCircle2, 
  Loader2, AlertTriangle, Sparkles
} from 'lucide-react';

interface PreparedSubscriptionCheckout {
  checkout_session_id: string;
  organization_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  amount_cents: number;
  currency: 'EGP';
  merchant_order_id: string;
  expires_at: string;
}

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const billing = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const { user } = useOptimizedAuth();
  const orgId = useOrgId();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch plan details
  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['payment-plan', planId],
    queryFn: async () => {
      if (!planId) return null;
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .gt('price_monthly', 0)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });

  // Fetch current subscription
  const { data: currentSub } = useQuery({
    queryKey: ['current-subscription', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!orgId,
  });

  const price = plan 
    ? (billing === 'yearly' ? plan.price_yearly : plan.price_monthly) 
    : 0;

  const durationLabel = billing === 'yearly' ? 'سنوي (12 شهر)' : 'شهري (30 يوم)';
  const durationDays = billing === 'yearly' ? 365 : (plan?.duration_days || 30);

  const yearlyDiscount = plan && plan.price_monthly > 0
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
    : 0;

  const handlePayment = async () => {
    if (!plan || !user || !orgId) {
      toast.error('بيانات غير مكتملة');
      return;
    }

    if (price <= 0) {
      toast.error('هذه الخطة غير متاحة للاشتراك');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: preparedData, error: prepareError } = await supabase.rpc(
        'prepare_subscription_checkout',
        {
          _organization_id: orgId,
          _plan_id: planId,
          _billing_cycle: billing,
        },
      );
      if (prepareError) throw prepareError;
      const prepared = preparedData as unknown as PreparedSubscriptionCheckout;
      if (!prepared?.checkout_session_id || !prepared?.merchant_order_id || prepared.amount_cents<=0) {
        throw new Error('تعذر تجهيز جلسة دفع آمنة');
      }

      const fullName = String(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
      const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || 'N/A';
      const lastName = nameParts.slice(1).join(' ') || 'N/A';
      const itemName = `خطة ${plan.name_ar || plan.name} - ${durationLabel}`;
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          organization_id: orgId,
          plan_id: planId,
          billing_cycle: billing,
          checkout_session_id: prepared.checkout_session_id,
          amount_cents: prepared.amount_cents,
          currency: prepared.currency,
          merchant_order_id: prepared.merchant_order_id,
          billing_data: {
            first_name: firstName,
            last_name: lastName,
            email: user.email || 'no-email@example.com',
            phone_number: String(user.user_metadata?.phone || '01000000000'),
            city: 'Cairo',
            country: 'EG',
          },
          items: [{
            name: itemName,
            amount_cents: prepared.amount_cents,
            quantity: 1,
            description: itemName,
          }],
        },
      });

      if (error) throw error;

      if (data?.iframe_url) {
        // Redirect to Paymob payment iframe
        window.location.href = data.iframe_url;
      } else {
        throw new Error('لم يتم استلام رابط الدفع');
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      toast.error(err instanceof Error ? err.message : 'فشل في بدء عملية الدفع');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!planId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">لم يتم تحديد خطة</h2>
            <p className="text-muted-foreground">يرجى اختيار خطة من صفحة الأسعار أولاً.</p>
            <Link to="/pricing">
              <Button className="mt-4">
                عرض الخطط
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">الخطة غير متاحة</h2>
            <p className="text-muted-foreground">اختر إحدى الخطط المدفوعة النشطة من صفحة الأسعار.</p>
            <Link to="/pricing">
              <Button className="mt-4">عرض الخطط</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/pricing" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="h-4 w-4" />
            <span>العودة للخطط</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">دفع آمن ومشفر</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">إتمام الاشتراك</h1>
          <p className="text-muted-foreground">أنت على بعد خطوة واحدة من تفعيل خطتك</p>
        </div>

        <div className="space-y-6">
          {/* Plan Summary Card */}
          <Card className="border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  تفاصيل الخطة
                </CardTitle>
                {plan?.name === 'Pro' && (
                  <Badge className="bg-primary text-primary-foreground">الأكثر شعبية</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Name */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الخطة</span>
                <span className="font-semibold text-foreground text-lg">
                  {plan?.name_ar || plan?.name}
                </span>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  المدة
                </span>
                <span className="font-medium text-foreground">{durationLabel}</span>
              </div>

              {/* Features summary */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المستخدمين</span>
                <span className="font-medium text-foreground">حتى {plan?.max_users} مستخدم</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الحجوزات الشهرية</span>
                <span className="font-medium text-foreground">حتى {plan?.max_bookings_per_month} حجز</span>
              </div>

              <Separator />

              {/* Price */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-semibold text-foreground">الإجمالي</span>
                <div className="text-left">
                  <div className="text-2xl font-bold text-primary">
                    {price.toLocaleString('ar-EG')} ج.م
                  </div>
                  {billing === 'yearly' && yearlyDiscount > 0 && (
                    <div className="text-sm text-green-600 font-medium">
                      وفر {yearlyDiscount}% مقارنة بالشهري
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current subscription info */}
          {currentSub && (
            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">اشتراكك الحالي</p>
                    <p>
                      خطة {currentSub.subscription_plans?.name_ar || 'غير محدد'} —
                      الحالة: {currentSub.status === 'active' ? 'نشط' : currentSub.status === 'trialing' ? 'تجريبي' : 'منتهي'}
                      {currentSub.expires_at && (
                        <> — ينتهي: {new Date(currentSub.expires_at).toLocaleDateString('ar-EG')}</>
                      )}
                    </p>
                    <p className="mt-1">سيتم تمديد اشتراكك بـ {durationDays} يوم عند نجاح الدفع.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Online payment. Bank transfer stays disabled until verified company
              bank details are configured; placeholder account data must never
              be presented to customers. */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-primary" />
                الدفع الإلكتروني الآمن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full h-14 text-lg gap-3"
                size="lg"
                onClick={handlePayment}
                disabled={isProcessing || price === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري تحويلك لبوابة الدفع...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    ادفع {price.toLocaleString('ar-EG')} ج.م
                  </>
                )}
              </Button>

              {/* Trust signals */}
              <div className="grid grid-cols-3 gap-4 text-center pt-4">
                <div className="space-y-1">
                  <Shield className="h-6 w-6 mx-auto text-green-600" />
                  <p className="text-xs text-muted-foreground">دفع مشفر وآمن</p>
                </div>
                <div className="space-y-1">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">تفعيل فوري</p>
                </div>
                <div className="space-y-1">
                  <CreditCard className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">وسائل Paymob المتاحة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
