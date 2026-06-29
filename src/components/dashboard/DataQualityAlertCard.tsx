import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDataQuality } from '@/hooks/useDataQuality';

const DataQualityAlertCard: React.FC = () => {
  const { data, isLoading } = useDataQuality();

  if (isLoading || !data) return null;

  const items = [
    { key: 'bookings_missing_dates', label: 'حجوزات بدون تواريخ', count: data.bookings_missing_dates },
    { key: 'bookings_missing_prices', label: 'حجوزات بدون أسعار', count: data.bookings_missing_prices },
    { key: 'bookings_missing_supplier', label: 'حجوزات بدون مورد', count: data.bookings_missing_supplier },
    { key: 'bookings_no_customer', label: 'حجوزات بدون عميل', count: data.bookings_no_customer },
  ];
  const total = items.reduce((s, i) => s + (i.count || 0), 0);

  if (total === 0) return null;

  return (
    <Card className="p-4 border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-500/15 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">سجلات بحاجة لإكمال ({total})</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              بعض الحجوزات غير مكتملة وقد تؤثر على دقة التقارير والمحاسبة.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {items.filter(i => i.count > 0).map(i => (
                <Badge key={i.key} variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                  {i.label}: {i.count}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/data-quality">
            مراجعة الآن
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Link>
        </Button>
      </div>
    </Card>
  );
};

export default DataQualityAlertCard;
