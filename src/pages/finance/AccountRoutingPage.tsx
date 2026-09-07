import { useMemo, useState } from 'react';
import { RotateCcw, Save, Settings2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountRouting, type AccountRoute, type AccountRoutingGroup, type RoutedAccountType } from '@/hooks/useAccountRouting';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';

const GROUP_LABELS: Record<AccountRoutingGroup, string> = {
  control: 'الحسابات الرقابية',
  treasury: 'الخزينة والبنوك',
  revenue: 'الإيرادات',
  cost: 'تكلفة الخدمات',
  expense: 'المصروفات',
  equity: 'حقوق الملكية',
};

const TYPE_LABELS: Record<RoutedAccountType, string> = {
  asset: 'أصول',
  liability: 'خصوم',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصروفات',
};

const GROUP_ORDER: AccountRoutingGroup[] = ['control', 'treasury', 'revenue', 'cost', 'expense', 'equity'];

const routeAccountLabel = (route: AccountRoute) =>
  route.account_code && route.account_name
    ? `${route.account_code} — ${route.account_name_ar || route.account_name}`
    : `البديل ${route.fallback_account_code}`;

export default function AccountRoutingPage() {
  const { routes, isLoading, error, refetch, canEdit, setRoute, resetRoute } = useAccountRouting();
  const { accounts } = useChartOfAccounts();
  const [pending, setPending] = useState<Record<string, string>>({});

  const groupedRoutes = useMemo(() => GROUP_ORDER.map((group) => ({
    group,
    items: routes.filter((route) => route.group_key === group),
  })).filter((section) => section.items.length > 0), [routes]);

  const selectAccount = (route: AccountRoute) => pending[route.routing_key] ?? route.account_id ?? '';

  const save = (route: AccountRoute) => {
    const accountId = selectAccount(route);
    if (!accountId) return;
    setRoute.mutate({ routingKey: route.routing_key, accountId });
  };

  const reset = (route: AccountRoute) => {
    setPending((current) => {
      const next = { ...current };
      delete next[route.routing_key];
      return next;
    });
    resetRoute.mutate(route.routing_key);
  };

  return (
    <div className="container mx-auto space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Settings2 className="h-8 w-8 text-primary" />
            توجيه الحسابات
          </h1>
          <p className="mt-1 text-muted-foreground">
            اربط الحسابات الافتراضية بحسابات شركتك. الترحيلات الجديدة تستخدم الاختيار هنا، وتظل الحسابات الافتراضية بديلًا آمنًا.
          </p>
        </div>
        <Badge variant="outline">لكل شركة على حدة</Badge>
      </div>

      <Alert>
        <AlertTitle>كيف يعمل التوجيه؟</AlertTitle>
        <AlertDescription>
          تختار حسابًا نشطًا من نفس نوع الحساب لكل وظيفة. إذا لم يتم اختيار حساب مخصص، يستخدم النظام الكود الافتراضي الظاهر بجوار الوظيفة.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>تعذر تحميل توجيه الحسابات</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{(error as Error).message || 'تأكد من تطبيق migration الحسابات المركزية.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>إعادة المحاولة</Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-44" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedRoutes.map(({ group, items }) => (
            <Card key={group}>
              <CardHeader>
                <CardTitle>{GROUP_LABELS[group]}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                {items.map((route) => {
                  const options = accounts.filter((account) => account.is_active && account.account_type === route.expected_account_type);
                  const selectedId = selectAccount(route);
                  const changed = selectedId !== (route.account_id ?? '');
                  return (
                    <div key={route.routing_key} className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{route.label_ar}</p>
                          <p className="text-xs text-muted-foreground">{route.label_en}</p>
                        </div>
                        <Badge variant={route.configured ? 'default' : 'secondary'}>
                          {route.configured ? 'مخصص' : 'افتراضي'}
                        </Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div className="space-y-1">
                          <Label htmlFor={`route-${route.routing_key}`}>الحساب ({TYPE_LABELS[route.expected_account_type]})</Label>
                          <Select
                            value={selectedId}
                            onValueChange={(value) => setPending((current) => ({ ...current, [route.routing_key]: value }))}
                            disabled={!canEdit || setRoute.isPending || resetRoute.isPending}
                          >
                            <SelectTrigger id={`route-${route.routing_key}`}>
                              <SelectValue placeholder="اختر حسابًا" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} — {account.account_name_ar || account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          البديل: <span className="font-mono">{route.fallback_account_code}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">الحالي: {routeAccountLabel(route)}</span>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => save(route)} disabled={!changed || !selectedId || setRoute.isPending}>
                              <Save className="ml-2 h-4 w-4" /> حفظ
                            </Button>
                            {route.configured && (
                              <Button size="sm" variant="outline" onClick={() => reset(route)} disabled={resetRoute.isPending}>
                                <RotateCcw className="ml-2 h-4 w-4" /> افتراضي
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
          {!error && routes.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد وظائف حسابية متاحة للشركة.</CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
