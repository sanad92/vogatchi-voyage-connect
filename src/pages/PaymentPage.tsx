import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  CreditCard, ArrowRight, Shield, Clock, CheckCircle2, 
  Loader2, AlertTriangle, Sparkles
} from 'lucide-react';

interface SubscriptionPriceQuote {
  amount_cents: number;
  original_amount_cents: number;
  discount_code: string | null;
  discount_percent: number | null;
}

interface PreparedSubscriptionCheckout extends SubscriptionPriceQuote {
  checkout_session_id: string;
  organization_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  currency: 'EGP';
  merchant_order_id: string;
  expires_at: string;
}

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const billing = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const { user } = useOptimizedAuth();
  const { organizationId: orgId, orgRole } = useOrganization();
  const canPurchase = orgRole === 'owner' || orgRole === 'manager';
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountCode, setDiscountCode] = useState('');

  // Fetch plan details
  const { data: plan, isLoading, isError, refetch: refetchPlan } = useQuery({
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

  const checkoutCapabilities = useQuery({
    queryKey: ['subscription-checkout-capabilities', user?.id],
    enabled: Boolean(user && orgId && plan && canPurchase),
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ discounts: boolean }>('create-payment', { method: 'GET' });
      if (error) throw error;
      return data;
    },
  });
  const discountAvailable = checkoutCapabilities.data?.discounts === true;
  const quote = useQuery({
    queryKey: ['subscription-price-quote', orgId, planId, billing, discountCode],
    enabled: Boolean(user && orgId && plan && canPurchase && discountAvailable),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('quote_subscription_discount', {
        _organization_id: orgId!,
        _plan_id: planId!,
        _billing_cycle: billing,
        _discount_code: discountCode || undefined,
      });
      if (error) throw error;
      return data as unknown as SubscriptionPriceQuote;
    },
  });
  const quotedAmount = discountAvailable ? quote.data?.amount_cents : Math.round(price * 100);
  const payable = quotedAmount === undefined ? price : quotedAmount / 100;
  const discount = discountAvailable && quote.data?.discount_code ? quote.data : null;
  const checkoutPricingUnavailable = checkoutCapabilities.isLoading || (discountAvailable && (quote.isFetching || quote.isError));

  const durationLabel = billing === 'yearly' ? 'سنوي (12 شهر)' : 'شهري (30 يوم)';
  const durationDays = billing === 'yearly' ? 365 : (plan?.duration_days || 30);

  const yearlyDiscount = plan && plan.price_monthly > 0
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
    : 0;

  const handlePayment = async () => {
    if (!plan || !planId || !user || !orgId || !canPurchase || quotedAmount === undefined || checkoutPricingUnavailable) {
      toast.error('بيانات غير مكتملة');
      return;
    }

    if (price <= 0) {
      toast.error('هذه الخطة غير متاحة للاشتراك');
      return;
    }

    setIsProcessing(true);
    try {
      const selection = { _organization_id: orgId, _plan_id: planId, _billing_cycle: billing };
      const { data: preparedData, error: prepareError } = discountAvailable
        ? await supabase.rpc('prepare_subscription_checkout_with_discount', { ...selection, _discount_code: discountCode || undefined })
        : await supabase.rpc('prepare_subscription_checkout', selection);
      if (prepareError) throw prepareError;
      const prepared = preparedData as unknown as PreparedSubscriptionCheckout;
      if (!prepared?.checkout_session_id || !prepared?.merchant_order_id || prepared.amount_cents<=0) {
        throw new Error('تعذر تجهيز جلسة دفع آمنة');
      }
      if (prepared.amount_cents !== quotedAmount || (discountAvailable && prepared.discount_code !== quote.data?.discount_code)) {
        if (discountAvailable) await quote.refetch();
        else await refetchPlan();
        toast.info('اتغير مبلغ الدفع. راجع الإجمالي واضغط ادفع مرة تانية.');
        return;
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
      const message = typeof err === 'object' && err && 'message' in err ? String(err.message) : 'فشل في بدء عملية الدفع';
      toast.error(message);
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

              {canPurchase && discountAvailable && (
                <div className="space-y-2">
                  <Label htmlFor="subscription-discount-code">كود الخصم</Label>
                  <form className="flex flex-wrap gap-2" onSubmit={(event) => {
                    event.preventDefault();
                    const code = discountInput.trim().toUpperCase();
                    if (code === discountCode) void quote.refetch();
                    else setDiscountCode(code);
                  }}>
                    <Input id="subscription-discount-code" className="min-w-32 flex-1" dir="ltr" autoComplete="off"
                      maxLength={32} value={discountInput} disabled={isProcessing}
                      onChange={(event) => setDiscountInput(event.target.value)} />
                    <Button type="submit" variant="outline" disabled={!discountInput.trim() || isProcessing || quote.isFetching}>
                      تطبيق
                    </Button>
                    {discountCode && (
                      <Button type="button" variant="ghost" disabled={isProcessing}
                        onClick={() => { setDiscountCode(''); setDiscountInput(''); }}>مسح الكود</Button>
                    )}
                  </form>
                  {quote.isError && (
                    <div className="flex flex-wrap items-center gap-2">
                      <p role="alert" className="text-sm text-destructive">{quote.error.message}</p>
                      {!discountCode && (
                        <Button type="button" size="sm" variant="outline" onClick={() => void quote.refetch()}>
                          إعادة المحاولة
                        </Button>
                      )}
                    </div>
                  )}
                  {discount && (
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      خصم <bdi>{discount.discount_percent}%</bdi> · <bdi data-no-translate>{discount.discount_code}</bdi>
                    </p>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-semibold text-foreground">الإجمالي</span>
                <div className="text-left">
                  <div className="text-2xl font-bold text-primary">
                    {payable.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
                  </div>
                  {discount && (
                    <div className="text-sm text-muted-foreground line-through">
                      {(discount.original_amount_cents / 100).toLocaleString('ar-EG')} ج.م
                    </div>
                  )}
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
                disabled={isProcessing || !canPurchase || checkoutPricingUnavailable || !quotedAmount}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري تحويلك لبوابة الدفع...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    ادفع {payable.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
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
