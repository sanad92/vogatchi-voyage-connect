import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home, XCircle, Loader2, CreditCard } from 'lucide-react';

/**
 * Paymob redirects back with query params:
 *   ?success=true&txn_response_code=APPROVED&order=...&amount_cents=...
 *   ?success=false&txn_response_code=DECLINED&...
 */
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);

  const success = searchParams.get('success') === 'true';
  const amountCents = parseInt(searchParams.get('amount_cents') || '0', 10);
  const txnId = searchParams.get('id') || searchParams.get('transaction_id') || '';
  const orderId = searchParams.get('order') || '';

  useEffect(() => {
    // Give the webhook time to process, then refresh subscription data
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['my-subscription-full'] });
      queryClient.invalidateQueries({ queryKey: ['my-payment-transactions'] });
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-6" dir="rtl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">جارٍ التحقق من حالة الدفع...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6" dir="rtl">
      <div className="max-w-md mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              {success ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
            </div>
            <CardTitle className={`text-2xl ${success ? 'text-green-600' : 'text-destructive'}`}>
              {success ? 'تم الدفع بنجاح!' : 'فشلت عملية الدفع'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
              <>
                {amountCents > 0 && (
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المبلغ:</span>
                      <span className="font-semibold text-foreground">
                        {(amountCents / 100).toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    {txnId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم المعاملة:</span>
                        <span className="font-mono text-foreground text-xs">{txnId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحالة:</span>
                      <span className="text-green-600 font-medium">مدفوع ✓</span>
                    </div>
                  </div>
                )}
                <p className="text-muted-foreground">
                  تم تفعيل اشتراكك بنجاح. يمكنك الآن استخدام جميع ميزات النظام.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                لم تتم عملية الدفع. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع مختلفة.
              </p>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={() => navigate('/dashboard')} className="flex-1">
                <Home className="h-4 w-4 ml-2" />
                {success ? 'الذهاب للوحة التحكم' : 'العودة للرئيسية'}
              </Button>
              {!success && (
                <Button variant="outline" onClick={() => navigate('/pricing')} className="flex-1">
                  <CreditCard className="h-4 w-4 ml-2" />
                  اختيار خطة
                </Button>
              )}
              {success && (
                <Button variant="outline" onClick={() => navigate('/subscription')} className="flex-1">
                  <CreditCard className="h-4 w-4 ml-2" />
                  إدارة الاشتراك
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
