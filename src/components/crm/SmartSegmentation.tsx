
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Target, TrendingUp, Filter, Settings, Brain } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useCRM } from '@/hooks/useCRM';

interface SegmentRule {
  field: string;
  operator: string;
  value: string | number;
}

interface SmartSegment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  customerCount: number;
  autoUpdate: boolean;
  color: string;
}

const SmartSegmentation = () => {
  const { customers } = useCustomers();
  const { customerSegments } = useCRM();
  const [selectedSegment, setSelectedSegment] = useState<SmartSegment | null>(null);
  const [newSegmentRules, setNewSegmentRules] = useState<SegmentRule[]>([]);

  // قطاعات ذكية مقترحة
  const smartSegments: SmartSegment[] = [
    {
      id: 'high-value',
      name: 'عملاء عالي القيمة',
      description: 'عملاء بقيمة إنفاق عالية ومتكررة',
      rules: [
        { field: 'total_spent', operator: '>', value: 50000 },
        { field: 'total_bookings', operator: '>=', value: 5 }
      ],
      customerCount: customers?.filter(c => (c.total_spent || 0) > 50000 && (c.total_bookings || 0) >= 5).length || 0,
      autoUpdate: true,
      color: '#10b981'
    },
    {
      id: 'at-risk',
      name: 'عملاء معرضون للمغادرة',
      description: 'عملاء لم يقوموا بحجوزات مؤخراً',
      rules: [
        { field: 'last_booking_date', operator: '<', value: '90 days ago' },
        { field: 'total_bookings', operator: '>', value: 0 }
      ],
      customerCount: customers?.filter(c => {
        if (!c.last_booking_date || c.total_bookings === 0) return false;
        const daysSinceLastBooking = Math.floor((Date.now() - new Date(c.last_booking_date).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceLastBooking > 90;
      }).length || 0,
      autoUpdate: true,
      color: '#ef4444'
    },
    {
      id: 'new-customers',
      name: 'عملاء جدد',
      description: 'عملاء انضموا في آخر 30 يوم',
      rules: [
        { field: 'created_at', operator: '>', value: '30 days ago' }
      ],
      customerCount: customers?.filter(c => {
        const daysSinceCreated = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCreated <= 30;
      }).length || 0,
      autoUpdate: true,
      color: '#3b82f6'
    },
    {
      id: 'frequent-travelers',
      name: 'مسافرون متكررون',
      description: 'عملاء بحجوزات متكررة',
      rules: [
        { field: 'total_bookings', operator: '>=', value: 3 },
        { field: 'last_booking_date', operator: '>', value: '60 days ago' }
      ],
      customerCount: customers?.filter(c => {
        if ((c.total_bookings || 0) < 3 || !c.last_booking_date) return false;
        const daysSinceLastBooking = Math.floor((Date.now() - new Date(c.last_booking_date).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceLastBooking <= 60;
      }).length || 0,
      autoUpdate: true,
      color: '#8b5cf6'
    },
    {
      id: 'loyalty-program',
      name: 'أعضاء برنامج الولاء',
      description: 'عملاء بنقاط ولاء عالية',
      rules: [
        { field: 'loyalty_points', operator: '>', value: 1000 }
      ],
      customerCount: customers?.filter(c => (c.loyalty_points || 0) > 1000).length || 0,
      autoUpdate: true,
      color: '#f59e0b'
    }
  ];

  // حساب التوقعات للقطاع
  const calculateSegmentPredictions = (segment: SmartSegment) => {
    const segmentCustomers = getSegmentCustomers(segment);
    const totalRevenue = segmentCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const avgOrderValue = segmentCustomers.length > 0 ? totalRevenue / segmentCustomers.length : 0;
    
    return {
      potentialRevenue: avgOrderValue * segmentCustomers.length * 1.2, // توقع نمو 20%
      conversionRate: segment.id === 'new-customers' ? 65 : segment.id === 'at-risk' ? 25 : 85,
      recommendedActions: getRecommendedActions(segment.id)
    };
  };

  const getSegmentCustomers = (segment: SmartSegment) => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      return segment.rules.every(rule => {
        const fieldValue = getFieldValue(customer, rule.field);
        return applyRule(fieldValue, rule.operator, rule.value);
      });
    });
  };

  const getFieldValue = (customer: any, field: string) => {
    switch (field) {
      case 'total_spent':
        return customer.total_spent || 0;
      case 'total_bookings':
        return customer.total_bookings || 0;
      case 'loyalty_points':
        return customer.loyalty_points || 0;
      case 'last_booking_date':
        return customer.last_booking_date;
      case 'created_at':
        return customer.created_at;
      default:
        return null;
    }
  };

  const applyRule = (fieldValue: any, operator: string, ruleValue: string | number) => {
    if (fieldValue === null || fieldValue === undefined) return false;
    
    switch (operator) {
      case '>':
        return fieldValue > ruleValue;
      case '>=':
        return fieldValue >= ruleValue;
      case '<':
        if (typeof ruleValue === 'string' && ruleValue.includes('days ago')) {
          const days = parseInt(ruleValue.split(' ')[0]);
          const targetDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          return new Date(fieldValue) < targetDate;
        }
        return fieldValue < ruleValue;
      case '<=':
        return fieldValue <= ruleValue;
      case '=':
        return fieldValue === ruleValue;
      default:
        return false;
    }
  };

  const getRecommendedActions = (segmentId: string) => {
    switch (segmentId) {
      case 'high-value':
        return ['عروض VIP حصرية', 'خدمة عملاء مخصصة', 'دعوات لفعاليات خاصة'];
      case 'at-risk':
        return ['حملة استعادة بخصومات', 'اتصال شخصي', 'استطلاع رأي لفهم الأسباب'];
      case 'new-customers':
        return ['رسالة ترحيب', 'عرض الحجز الثاني', 'برنامج تعريفي'];
      case 'frequent-travelers':
        return ['عروض باقات سفر', 'نقاط ولاء إضافية', 'خدمات حجز مبكر'];
      case 'loyalty-program':
        return ['عروض استبدال النقاط', 'مكافآت إضافية', 'ترقية العضوية'];
      default:
        return [];
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="smart-segments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="smart-segments">القطاعات الذكية</TabsTrigger>
          <TabsTrigger value="existing-segments">القطاعات الحالية</TabsTrigger>
          <TabsTrigger value="segment-builder">منشئ القطاعات</TabsTrigger>
        </TabsList>

        <TabsContent value="smart-segments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {smartSegments.map((segment) => {
              const predictions = calculateSegmentPredictions(segment);
              
              return (
                <Card key={segment.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedSegment(segment)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        <CardTitle className="text-lg">{segment.name}</CardTitle>
                      </div>
                      {segment.autoUpdate && (
                        <Badge variant="secondary" className="text-xs">
                          <Brain className="h-3 w-3 mr-1" />
                          ذكي
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{segment.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">عدد العملاء</span>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span className="font-bold">{segment.customerCount}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">معدل التحويل المتوقع</span>
                        <span className="font-bold text-green-600">
                          {predictions.conversionRate}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">الإيرادات المحتملة</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(predictions.potentialRevenue)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="flex flex-wrap gap-1">
                        {predictions.recommendedActions.slice(0, 2).map((action, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="existing-segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerSegments?.map((segment) => (
              <Card key={segment.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <CardTitle className="text-lg">{segment.name_ar}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">الحد الأدنى للحجوزات</span>
                      <span className="font-medium">{segment.minimum_bookings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">الحد الأدنى للإنفاق</span>
                      <span className="font-medium">{formatCurrency(segment.minimum_total_spent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">عدد العملاء</span>
                      <span className="font-medium">
                        {customers?.filter(c => c.segment_id === segment.id).length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="segment-builder" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartSegmentation;
