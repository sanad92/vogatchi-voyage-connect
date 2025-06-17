
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download } from 'lucide-react';

interface DateRange {
  start: string;
  end: string;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (field: keyof DateRange, value: string) => void;
  onExport?: () => void;
}

const DateRangeFilter = ({ dateRange, onDateRangeChange, onExport }: DateRangeFilterProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          فترة التقرير
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>من تاريخ</Label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange('start', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>إلى تاريخ</Label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange('end', e.target.value)}
            />
          </div>
          {onExport && (
            <div className="flex items-end">
              <Button className="w-full" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                تصدير التقرير
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DateRangeFilter;
