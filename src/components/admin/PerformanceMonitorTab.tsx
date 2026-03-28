
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/OrganizationContext";
import { 
  Activity, 
  Database, 
  Server, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Cpu,
  HardDrive,
  Wifi
} from "lucide-react";

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  response_time: number;
  api_requests_per_hour: number;
  database_size: string;
  uptime: string;
}

const PerformanceMonitorTab = () => {
  const { organization } = useOrganization();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu_usage: 45,
    memory_usage: 62,
    disk_usage: 78,
    active_connections: 23,
    response_time: 120,
    api_requests_per_hour: 456,
    database_size: "2.3 GB",
    uptime: "7 أيام و 14 ساعة"
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // محاكاة تحديث البيانات
  const refreshMetrics = async () => {
    setIsLoading(true);
    
    // محاكاة استدعاء API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMetrics({
      cpu_usage: Math.floor(Math.random() * 40) + 20,
      memory_usage: Math.floor(Math.random() * 30) + 50,
      disk_usage: Math.floor(Math.random() * 20) + 70,
      active_connections: Math.floor(Math.random() * 20) + 15,
      response_time: Math.floor(Math.random() * 100) + 80,
      api_requests_per_hour: Math.floor(Math.random() * 200) + 400,
      database_size: `${(Math.random() * 2 + 2).toFixed(1)} GB`,
      uptime: "7 أيام و 14 ساعة"
    });
    
    setIsLoading(false);
  };

  // تحديث تلقائي كل 30 ثانية
  useEffect(() => {
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, type: 'usage' | 'response') => {
    if (type === 'usage') {
      if (value > 80) return 'text-red-600';
      if (value > 60) return 'text-yellow-600';
      return 'text-green-600';
    } else {
      if (value > 200) return 'text-red-600';
      if (value > 150) return 'text-yellow-600';
      return 'text-green-600';
    }
  };

  const getProgressColor = (value: number) => {
    if (value > 80) return 'bg-red-500';
    if (value > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (value: number, type: 'usage' | 'response') => {
    if (type === 'usage') {
      if (value > 80) return <Badge variant="destructive">عالي</Badge>;
      if (value > 60) return <Badge className="bg-yellow-500">متوسط</Badge>;
      return <Badge className="bg-green-500">طبيعي</Badge>;
    } else {
      if (value > 200) return <Badge variant="destructive">بطيء</Badge>;
      if (value > 150) return <Badge className="bg-yellow-500">متوسط</Badge>;
      return <Badge className="bg-green-500">سريع</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* شريط التحديث */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">مراقبة الأداء</h2>
        <Button
          onClick={refreshMetrics}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">وقت التشغيل</p>
                <p className="text-2xl font-bold text-green-600">{metrics.uptime}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الاتصالات النشطة</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.active_connections}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">طلبات API/ساعة</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.api_requests_per_hour}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">حجم قاعدة البيانات</p>
                <p className="text-2xl font-bold text-indigo-600">{metrics.database_size}</p>
              </div>
              <Database className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* مؤشرات الأداء الرئيسية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              استخدام المعالج
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-semibold ${getStatusColor(metrics.cpu_usage, 'usage')}`}>
                  {metrics.cpu_usage}%
                </span>
                {getStatusBadge(metrics.cpu_usage, 'usage')}
              </div>
              <Progress 
                value={metrics.cpu_usage} 
                className={`h-3 ${getProgressColor(metrics.cpu_usage)}`}
              />
              <p className="text-sm text-gray-600">
                المعدل الطبيعي: أقل من 70%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              استخدام الذاكرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-semibold ${getStatusColor(metrics.memory_usage, 'usage')}`}>
                  {metrics.memory_usage}%
                </span>
                {getStatusBadge(metrics.memory_usage, 'usage')}
              </div>
              <Progress 
                value={metrics.memory_usage} 
                className={`h-3 ${getProgressColor(metrics.memory_usage)}`}
              />
              <p className="text-sm text-gray-600">
                المعدل الطبيعي: أقل من 80%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              استخدام التخزين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-semibold ${getStatusColor(metrics.disk_usage, 'usage')}`}>
                  {metrics.disk_usage}%
                </span>
                {getStatusBadge(metrics.disk_usage, 'usage')}
              </div>
              <Progress 
                value={metrics.disk_usage} 
                className={`h-3 ${getProgressColor(metrics.disk_usage)}`}
              />
              <p className="text-sm text-gray-600">
                المعدل الطبيعي: أقل من 85%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              زمن الاستجابة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-semibold ${getStatusColor(metrics.response_time, 'response')}`}>
                  {metrics.response_time} ms
                </span>
                {getStatusBadge(metrics.response_time, 'response')}
              </div>
              <Progress 
                value={Math.min(metrics.response_time / 3, 100)} 
                className={`h-3 ${getProgressColor(metrics.response_time / 3)}`}
              />
              <p className="text-sm text-gray-600">
                المعدل الطبيعي: أقل من 150ms
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التنبيهات والتوصيات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            التنبيهات والتوصيات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.cpu_usage > 80 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">استخدام عالي للمعالج</p>
                  <p className="text-sm text-red-600">يُنصح بمراجعة العمليات الجارية وتحسين الاستعلامات</p>
                </div>
              </div>
            )}
            
            {metrics.memory_usage > 80 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">استخدام عالي للذاكرة</p>
                  <p className="text-sm text-red-600">قد تحتاج لإعادة تشغيل الخدمات أو ترقية الخادم</p>
                </div>
              </div>
            )}
            
            {metrics.disk_usage > 85 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">مساحة التخزين محدودة</p>
                  <p className="text-sm text-red-600">يُنصح بحذف الملفات القديمة أو ترقية التخزين</p>
                </div>
              </div>
            )}
            
            {metrics.response_time > 200 && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">زمن استجابة بطيء</p>
                  <p className="text-sm text-yellow-600">يُنصح بمراجعة الشبكة وتحسين قاعدة البيانات</p>
                </div>
              </div>
            )}
            
            {metrics.cpu_usage <= 70 && metrics.memory_usage <= 70 && metrics.disk_usage <= 80 && metrics.response_time <= 150 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">الأداء ممتاز</p>
                  <p className="text-sm text-green-600">جميع المؤشرات في النطاق الطبيعي</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitorTab;
