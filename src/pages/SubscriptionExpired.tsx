import { useSubscriptionEnforcement } from '@/hooks/useSubscriptionEnforcement';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const SubscriptionExpiredPage = () => {
  const { subscription } = useSubscriptionEnforcement();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-lg w-full border-destructive/30">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">الاشتراك منتهٍ</h1>
            <p className="text-muted-foreground">
              انتهت صلاحية اشتراكك
              {subscription?.expires_at && (
                <> بتاريخ <strong>{new Date(subscription.expires_at).toLocaleDateString('ar-EG')}</strong></>
              )}.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-right">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <span className="text-muted-foreground">لا يمكن إضافة حجوزات أو عملاء أو فواتير جديدة.</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <span className="text-muted-foreground">لا يمكن تعديل أو حذف البيانات الموجودة.</span>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">يمكنك الاطلاع على بياناتك الحالية وتصدير التقارير.</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              تواصل مع مدير المنصة لتجديد اشتراكك أو ترقية خطتك.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                عرض البيانات (قراءة فقط)
              </Button>
            </div>
          </div>

          {subscription?.plan_name_ar && (
            <p className="text-xs text-muted-foreground">
              الخطة السابقة: {subscription.plan_name_ar}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionExpiredPage;
