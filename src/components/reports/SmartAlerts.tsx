
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Bell, CheckCircle, XCircle, TrendingUp, DollarSign, Calendar, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AlertItem {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  value?: number;
  threshold?: number;
  actionRequired: boolean;
  createdAt: Date;
}

const SmartAlerts = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertSettings, setAlertSettings] = useState({
    budgetOverrun: true,
    expenseSpike: true,
    paymentDue: true,
    monthlyTarget: true,
    cashFlow: true
  });

  // محاكاة التنبيهات
  useEffect(() => {
    const mockAlerts: AlertItem[] = [
      {
        id: '1',
        type: 'danger',
        title: 'تجاوز الميزانية',
        message: 'تم تجاوز ميزانية "المصروفات العامة" بنسبة 15%',
        priority: 'high',
        category: 'budget',
        value: 115,
        threshold: 100,
        actionRequired: true,
        createdAt: new Date()
      },
      {
        id: '2',
        type: 'warning',
        title: 'اقتراب من الحد الأقصى',
        message: 'ميزانية "الصيانة" وصلت إلى 85% من الحد المخصص',
        priority: 'medium',
        category: 'budget',
        value: 85,
        threshold: 90,
        actionRequired: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: '3',
        type: 'info',
        title: 'ارتفاع في المصروفات',
        message: 'زيادة في المصروفات بنسبة 12% مقارنة بالشهر السابق',
        priority: 'medium',
        category: 'trends',
        value: 112,
        threshold: 110,
        actionRequired: false,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        id: '4',
        type: 'warning',
        title: 'دفعة مستحقة',
        message: 'يوجد 3 دفعات إيجار مستحقة خلال الأسبوع القادم',
        priority: 'high',
        category: 'payments',
        actionRequired: true,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        id: '5',
        type: 'success',
        title: 'تحقيق الهدف',
        message: 'تم تحقيق هدف توفير 10% من ميزانية "المرافق"',
        priority: 'low',
        category: 'achievements',
        value: 110,
        threshold: 100,
        actionRequired: false,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000)
      }
    ];

    setAlerts(mockAlerts);
  }, []);

  // تصفية التنبيهات حسب الأولوية
  const getAlertsByPriority = (priority: 'high' | 'medium' | 'low') => {
    return alerts.filter(alert => alert.priority === priority);
  };

  // الحصول على لون التنبيه
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'danger': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // الحصول على أيقونة التنبيه
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'danger': return <XCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'info': return <Bell className="h-5 w-5" />;
      case 'success': return <CheckCircle className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  // حذف تنبيه
  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
    toast({
      title: "تم إزالة التنبيه",
      description: "تم إزالة التنبيه بنجاح",
    });
  };

  // تحديث إعدادات التنبيهات
  const updateAlertSetting = (setting: string, value: boolean) => {
    setAlertSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // إحصائيات التنبيهات
  const alertStats = {
    total: alerts.length,
    high: getAlertsByPriority('high').length,
    medium: getAlertsByPriority('medium').length,
    low: getAlertsByPriority('low').length,
    actionRequired: alerts.filter(a => a.actionRequired).length
  };

  return (
    <div className="space-y-6">
      {/* ملخص التنبيهات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التنبيهات</CardTitle>
            <Bell className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertStats.total}</div>
            <p className="text-xs text-muted-foreground">تنبيه نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عالية الأولوية</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertStats.high}</div>
            <p className="text-xs text-muted-foreground">يتطلب إجراء فوري</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسطة الأولوية</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alertStats.medium}</div>
            <p className="text-xs text-muted-foreground">يتطلب متابعة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">يتطلب إجراء</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{alertStats.actionRequired}</div>
            <p className="text-xs text-muted-foreground">إجراء مطلوب</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قائمة التنبيهات */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                التنبيهات النشطة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد تنبيهات حالياً
                </div>
              ) : (
                alerts.map((alert) => (
                  <Alert key={alert.id} className={`${getAlertColor(alert.type)} relative`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge 
                              variant={
                                alert.priority === 'high' ? 'destructive' :
                                alert.priority === 'medium' ? 'default' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {alert.priority === 'high' ? 'عالية' :
                               alert.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                            </Badge>
                            {alert.actionRequired && (
                              <Badge variant="outline" className="text-xs">
                                يتطلب إجراء
                              </Badge>
                            )}
                          </div>
                          <AlertDescription className="text-sm mb-2">
                            {alert.message}
                          </AlertDescription>
                          {alert.value && alert.threshold && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>التقدم: {alert.value}%</span>
                                <span>الحد: {alert.threshold}%</span>
                              </div>
                              <Progress 
                                value={alert.value} 
                                className="h-2"
                              />
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {alert.createdAt.toLocaleString('ar-SA')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </Button>
                    </div>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* إعدادات التنبيهات */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات التنبيهات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">تجاوز الميزانية</label>
                <Switch
                  checked={alertSettings.budgetOverrun}
                  onCheckedChange={(value) => updateAlertSetting('budgetOverrun', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">ارتفاع المصروفات</label>
                <Switch
                  checked={alertSettings.expenseSpike}
                  onCheckedChange={(value) => updateAlertSetting('expenseSpike', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">دفعات مستحقة</label>
                <Switch
                  checked={alertSettings.paymentDue}
                  onCheckedChange={(value) => updateAlertSetting('paymentDue', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">أهداف شهرية</label>
                <Switch
                  checked={alertSettings.monthlyTarget}
                  onCheckedChange={(value) => updateAlertSetting('monthlyTarget', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">التدفق النقدي</label>
                <Switch
                  checked={alertSettings.cashFlow}
                  onCheckedChange={(value) => updateAlertSetting('cashFlow', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* ملخص الأداء */}
          <Card>
            <CardHeader>
              <CardTitle>ملخص الأداء</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">الميزانية المستخدمة</span>
                <span className="font-medium">78%</span>
              </div>
              <Progress value={78} className="h-2" />

              <div className="flex justify-between items-center">
                <span className="text-sm">تحقيق الأهداف</span>
                <span className="font-medium">92%</span>
              </div>
              <Progress value={92} className="h-2" />

              <div className="flex justify-between items-center">
                <span className="text-sm">الالتزام بالخطة</span>
                <span className="font-medium">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SmartAlerts;
