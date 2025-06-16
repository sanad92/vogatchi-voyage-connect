
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Bot, 
  Clock, 
  MessageSquare, 
  Calendar, 
  Settings,
  Play,
  Pause,
  Plus,
  Target,
  Zap
} from "lucide-react";
import { Customer } from "@/types/customer";
import { useCustomerService } from "@/hooks/useCustomerService";

interface AdvancedFollowUpAutomationProps {
  customers: Customer[];
}

const AdvancedFollowUpAutomation = ({ customers }: AdvancedFollowUpAutomationProps) => {
  const { createFollowUp } = useCustomerService();
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: '',
    delay: 1,
    delayUnit: 'days',
    action: '',
    template: '',
    isActive: true,
    conditions: {
      customerSegment: 'all',
      bookingType: 'all',
      bookingValue: { min: 0, max: 999999 }
    }
  });

  // قواعد المتابعة الآلية الموجودة
  const automationRules = [
    {
      id: '1',
      name: 'ترحيب بالعملاء الجدد',
      trigger: 'customer_created',
      delay: 1,
      delayUnit: 'hours',
      action: 'send_whatsapp',
      template: 'مرحباً {name}، نرحب بك في عائلة فيجن للسياحة! نحن هنا لخدمتك',
      isActive: true,
      stats: { triggered: 45, successful: 43, failed: 2 }
    },
    {
      id: '2',
      name: 'تأكيد الحجز',
      trigger: 'booking_created',
      delay: 30,
      delayUnit: 'minutes',
      action: 'send_email',
      template: 'تم تأكيد حجزك رقم {booking_reference}. تفاصيل الحجز في المرفق.',
      isActive: true,
      stats: { triggered: 128, successful: 125, failed: 3 }
    },
    {
      id: '3',
      name: 'متابعة قبل السفر',
      trigger: 'booking_confirmed',
      delay: 2,
      delayUnit: 'days',
      action: 'create_task',
      template: 'متابعة العميل قبل السفر - التأكد من الأوراق والتفاصيل',
      isActive: true,
      stats: { triggered: 89, successful: 85, failed: 4 }
    },
    {
      id: '4',
      name: 'استطلاع الرضا',
      trigger: 'booking_completed',
      delay: 3,
      delayUnit: 'days',
      action: 'send_satisfaction_survey',
      template: 'نود معرفة رأيك في خدماتنا. يرجى تقييم تجربتك معنا.',
      isActive: false,
      stats: { triggered: 34, successful: 28, failed: 6 }
    },
    {
      id: '5',
      name: 'عروض للعملاء المميزين',
      trigger: 'vip_customer',
      delay: 7,
      delayUnit: 'days',
      action: 'send_special_offer',
      template: 'عميلنا المميز، لدينا عروض خاصة لك! خصم 20% على حجزك القادم.',
      isActive: true,
      stats: { triggered: 12, successful: 10, failed: 2 }
    }
  ];

  const triggerOptions = [
    { value: 'customer_created', label: 'إضافة عميل جديد' },
    { value: 'booking_created', label: 'إنشاء حجز جديد' },
    { value: 'booking_confirmed', label: 'تأكيد الحجز' },
    { value: 'booking_completed', label: 'اكتمال الحجز' },
    { value: 'payment_received', label: 'استلام الدفعة' },
    { value: 'vip_customer', label: 'عميل VIP' },
    { value: 'inactive_customer', label: 'عميل غير نشط' }
  ];

  const actionOptions = [
    { value: 'send_whatsapp', label: 'إرسال رسالة واتساب' },
    { value: 'send_email', label: 'إرسال بريد إلكتروني' },
    { value: 'send_sms', label: 'إرسال رسالة نصية' },
    { value: 'create_task', label: 'إنشاء مهمة متابعة' },
    { value: 'send_satisfaction_survey', label: 'إرسال استطلاع رضا' },
    { value: 'send_special_offer', label: 'إرسال عرض خاص' }
  ];

  const handleCreateRule = () => {
    console.log('Creating automation rule:', newRule);
    setIsCreateRuleOpen(false);
    // إعادة تعيين النموذج
    setNewRule({
      name: '',
      trigger: '',
      delay: 1,
      delayUnit: 'days',
      action: '',
      template: '',
      isActive: true,
      conditions: {
        customerSegment: 'all',
        bookingType: 'all',
        bookingValue: { min: 0, max: 999999 }
      }
    });
  };

  const toggleRuleStatus = (ruleId: string) => {
    console.log(`Toggling rule ${ruleId}`);
  };

  const testRule = (ruleId: string) => {
    console.log(`Testing rule ${ruleId}`);
  };

  // إحصائيات الأتمتة
  const automationStats = {
    totalRules: automationRules.length,
    activeRules: automationRules.filter(r => r.isActive).length,
    totalTriggered: automationRules.reduce((sum, r) => sum + r.stats.triggered, 0),
    successRate: automationRules.reduce((sum, r) => sum + r.stats.triggered, 0) > 0 ? 
      (automationRules.reduce((sum, r) => sum + r.stats.successful, 0) / 
       automationRules.reduce((sum, r) => sum + r.stats.triggered, 0)) * 100 : 0
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          أتمتة المتابعة المتقدمة
        </CardTitle>
        
        <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              إضافة قاعدة جديدة
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>إنشاء قاعدة أتمتة جديدة</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">اسم القاعدة</label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="أدخل اسم القاعدة"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">المحفز</label>
                  <Select value={newRule.trigger} onValueChange={(value) => setNewRule({ ...newRule, trigger: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المحفز" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">الإجراء</label>
                  <Select value={newRule.action} onValueChange={(value) => setNewRule({ ...newRule, action: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الإجراء" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">التأخير</label>
                  <Input
                    type="number"
                    value={newRule.delay}
                    onChange={(e) => setNewRule({ ...newRule, delay: Number(e.target.value) })}
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">وحدة التأخير</label>
                  <Select value={newRule.delayUnit} onValueChange={(value) => setNewRule({ ...newRule, delayUnit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">دقائق</SelectItem>
                      <SelectItem value="hours">ساعات</SelectItem>
                      <SelectItem value="days">أيام</SelectItem>
                      <SelectItem value="weeks">أسابيع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">نموذج الرسالة</label>
                <Textarea
                  value={newRule.template}
                  onChange={(e) => setNewRule({ ...newRule, template: e.target.value })}
                  placeholder="اكتب نموذج الرسالة... يمكنك استخدام {name} و {booking_reference}"
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newRule.isActive}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, isActive: checked })}
                />
                <label className="text-sm">تفعيل القاعدة فور الإنشاء</label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleCreateRule}
                  disabled={!newRule.name || !newRule.trigger || !newRule.action}
                  className="flex-1"
                >
                  إنشاء القاعدة
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateRuleOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* إحصائيات الأتمتة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Settings className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="font-bold text-lg">{automationStats.totalRules}</p>
            <p className="text-sm text-gray-600">إجمالي القواعد</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Play className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="font-bold text-lg">{automationStats.activeRules}</p>
            <p className="text-sm text-gray-600">قواعد نشطة</p>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Zap className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="font-bold text-lg">{automationStats.totalTriggered}</p>
            <p className="text-sm text-gray-600">مرات التشغيل</p>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <Target className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="font-bold text-lg">{Math.round(automationStats.successRate)}%</p>
            <p className="text-sm text-gray-600">معدل النجاح</p>
          </div>
        </div>

        {/* قائمة قواعد الأتمتة */}
        <div>
          <h4 className="font-semibold mb-3">قواعد الأتمتة الحالية</h4>
          <div className="space-y-3">
            {automationRules.map(rule => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${rule.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {rule.isActive ? (
                        <Play className="h-4 w-4 text-green-600" />
                      ) : (
                        <Pause className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-medium">{rule.name}</h5>
                      <p className="text-sm text-gray-600">
                        {triggerOptions.find(t => t.value === rule.trigger)?.label} → {' '}
                        {actionOptions.find(a => a.value === rule.action)?.label}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "نشط" : "معطل"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testRule(rule.id)}
                    >
                      اختبار
                    </Button>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => toggleRuleStatus(rule.id)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">التأخير:</span>
                    <span className="ml-2 font-medium">
                      {rule.delay} {rule.delayUnit === 'minutes' ? 'دقيقة' : 
                                   rule.delayUnit === 'hours' ? 'ساعة' : 
                                   rule.delayUnit === 'days' ? 'يوم' : 'أسبوع'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">مرات التشغيل:</span>
                    <span className="ml-2 font-medium text-blue-600">{rule.stats.triggered}</span>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">معدل النجاح:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {rule.stats.triggered > 0 ? 
                        Math.round((rule.stats.successful / rule.stats.triggered) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                  <strong>النموذج:</strong> {rule.template}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFollowUpAutomation;
