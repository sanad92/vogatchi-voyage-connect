import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { usePriceCatalog } from '@/hooks/usePriceCatalog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  priceSheet: string;
  onPriceSheetChange: (value: string) => void;
}

export const SalesAgentCard: React.FC<Props> = ({ enabled, onToggle, priceSheet, onPriceSheetChange }) => {
  const { rows, destinations, lastSync, sync, isSyncing } = usePriceCatalog();
  const [sheet, setSheet] = useState(priceSheet || '');

  const handleSync = async () => {
    await sync(sheet.trim());
    onPriceSheetChange(sheet.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> وكيل المبيعات الذكي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">تشغيل أسلوب البيع الاستشاري</Label>
            <p className="text-xs text-muted-foreground">
              يؤهّل طلب العميل ويقترح خيارات بأسعار البيع المعتمدة، ثم يسلّم الطلب لموظف المبيعات.
              لا يصدر عرضًا رسميًا ولا يؤكد حجزًا.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>

        <div>
          <Label>ملف أسعار الشركة (رابط Google Sheets)</Label>
          <div className="flex gap-2 mt-1">
            <Input value={sheet} onChange={(e) => setSheet(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..." />
            <Button type="button" variant="outline" onClick={handleSync} disabled={isSyncing || !sheet.trim()}>
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <RefreshCw className="w-4 h-4 ml-1" />}
              تحديث الأسعار
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            يُقرأ سعر البيع فقط. التكاليف الداخلية وأكواد الموردين لا تُستخدم في الرد على العميل.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{rows.length} سعر محمّل</Badge>
          {destinations.slice(0, 8).map((d) => <Badge key={d} variant="outline">{d}</Badge>)}
          {destinations.length > 8 && <Badge variant="outline">+{destinations.length - 8}</Badge>}
        </div>

        {lastSync && (
          <p className="text-xs text-muted-foreground">
            آخر تحديث: {format(new Date(lastSync.started_at), 'HH:mm dd/MM', { locale: ar })}
            {lastSync.status === 'failed'
              ? ` — فشل: ${lastSync.error_message || 'خطأ غير معروف'}`
              : ` — ${lastSync.rows_imported} سعر من ${lastSync.tabs_imported} وجهة`}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
