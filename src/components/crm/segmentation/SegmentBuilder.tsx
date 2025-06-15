
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';

const SegmentBuilder = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          منشئ القطاعات المخصص
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="segment-name">اسم القطاع</Label>
            <Input id="segment-name" placeholder="أدخل اسم القطاع الجديد" />
          </div>
          
          <div>
            <Label>قواعد القطاع</Label>
            <div className="space-y-2 mt-2">
              <div className="flex gap-2 items-center">
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="الحقل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_spent">إجمالي الإنفاق</SelectItem>
                    <SelectItem value="total_bookings">عدد الحجوزات</SelectItem>
                    <SelectItem value="loyalty_points">نقاط الولاء</SelectItem>
                    <SelectItem value="last_booking_date">تاريخ آخر حجز</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="المشغل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">أكبر من</SelectItem>
                    <SelectItem value=">=">أكبر أو يساوي</SelectItem>
                    <SelectItem value="<">أصغر من</SelectItem>
                    <SelectItem value="<=">أصغر أو يساوي</SelectItem>
                    <SelectItem value="=">يساوي</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input placeholder="القيمة" className="w-32" />
                
                <Button variant="outline" size="sm">
                  إضافة قاعدة
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button>إنشاء القطاع</Button>
            <Button variant="outline">معاينة النتائج</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SegmentBuilder;
