import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { useFeatureFlags, useFlagMutations } from '@/hooks/useFeatureFlag';

// Curated catalog of togglable features
const CATALOG: { key: string; label: string; description: string; category: string }[] = [
  { key: 'ai_assistant', label: 'المساعد الذكي', description: 'تفعيل واجهة الذكاء الاصطناعي للاستفسارات', category: 'AI' },
  { key: 'ai_smart_reply', label: 'الرد الذكي على واتساب', description: 'اقتراحات ردود آلية للمحادثات', category: 'AI' },
  { key: 'booking_automation', label: 'أتمتة الحجوزات', description: 'إنشاء الفواتير وأوامر الدفع تلقائيًا', category: 'Bookings' },
  { key: 'whatsapp_broadcast', label: 'حملات واتساب', description: 'تفعيل نظام الإرسال الجماعي', category: 'Marketing' },
  { key: 'multi_currency', label: 'العملات المتعددة', description: 'دعم عمليات بأكثر من عملة', category: 'Finance' },
  { key: 'gl_posting', label: 'الترحيل المحاسبي التلقائي', description: 'ترحيل القيود إلى دفتر الأستاذ تلقائيًا', category: 'Finance' },
  { key: 'refund_workflow', label: 'مسار المرتجعات', description: 'تفعيل موافقات المرتجعات', category: 'Finance' },
  { key: 'white_label', label: 'الهوية البصرية المخصصة', description: 'استخدام شعار وألوان المؤسسة', category: 'Branding' },
];

export default function FeatureFlagsPage() {
  const { data = [], isLoading } = useFeatureFlags();
  const { upsert } = useFlagMutations();

  const flagMap = new Map(data.map((f) => [f.flag_key, f]));
  const grouped = CATALOG.reduce<Record<string, typeof CATALOG>>((acc, f) => {
    (acc[f.category] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Flag className="h-6 w-6" /> الميزات</h1>
        <p className="text-sm text-muted-foreground">تفعيل أو تعطيل ميزات النظام لمؤسستك</p>
      </div>

      {isLoading ? <div>جارٍ التحميل...</div> : Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((f) => {
              const flag = flagMap.get(f.key);
              const enabled = flag?.enabled ?? false;
              return (
                <Card key={f.key} className="hover:shadow-sm transition">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold flex items-center gap-2">
                        {f.label}
                        {enabled && <Badge className="bg-green-100 text-green-700 border-green-200">مفعّل</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{f.description}</div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => upsert.mutate({ flag_key: f.key, enabled: v, description: f.description })}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
