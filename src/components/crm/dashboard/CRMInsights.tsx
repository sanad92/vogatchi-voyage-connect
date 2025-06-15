
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';

const CRMInsights = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          الرؤى الذكية والتوصيات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 توصية ذكية</h4>
            <p className="text-blue-700 text-sm">
              لديك 23 عميل معرض للمغادرة. نوصي بإرسال حملة استعادة بخصم 15% خلال الأسبوع القادم.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">📈 فرصة نمو</h4>
            <p className="text-green-700 text-sm">
              العملاء الجدد يظهرون نمط حجز مرتفع. زيادة الاستثمار في التسويق الرقمي قد تحقق عائد 300%.
            </p>
          </div>
          
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">⚠️ تحذير</h4>
            <p className="text-orange-700 text-sm">
              معدل التراجع ارتفع بنسبة 15% هذا الشهر. يُنصح بمراجعة استراتيجية الاحتفاظ بالعملاء.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">🎯 هدف مقترح</h4>
            <p className="text-purple-700 text-sm">
              زيادة متوسط قيمة الطلب إلى 25,000 ج.م خلال الربع القادم من خلال عروض الباقات المجمعة.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CRMInsights;
