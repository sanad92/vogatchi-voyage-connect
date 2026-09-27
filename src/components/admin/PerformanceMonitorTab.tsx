import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const metrics = ['استخدام المعالج', 'استخدام الذاكرة', 'استخدام القرص', 'الاتصالات النشطة', 'زمن الاستجابة', 'طلبات الساعة', 'حجم قاعدة البيانات', 'مدة التشغيل'];

export default function PerformanceMonitorTab() {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />مراقبة الأداء</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Badge variant="secondary">قياسات الخادم غير متاحة</Badge>
          <p>لم يُربط مصدر قياسات فعلي بهذه الشاشة. لا يمكن تحديد حالة الخادم أو مستوى أدائه من هنا حاليًا.</p>
          <p className="text-sm text-muted-foreground">راجع لوحة مزود الاستضافة للاطلاع على القياسات المتاحة. مراقبة الأعطال وإرسال التنبيهات من هذه الشاشة غير مفعّلين.</p>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(label => (
          <Card key={label}>
            <CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">غير متاح</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
