
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MessageCircle, 
  Mail, 
  Plus,
  Bell,
  CheckCircle,
  AlertTriangle,
  Users
} from "lucide-react";
import { useCustomerService } from "@/hooks/useCustomerService";
import { Customer } from "@/types/customer";

interface CustomerFollowUpManagerProps {
  customers: Customer[];
  selectedCustomers: string[];
}

const CustomerFollowUpManager = ({ customers, selectedCustomers }: CustomerFollowUpManagerProps) => {
  const [followUpType, setFollowUpType] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { 
    followUps, 
    todayFollowUps, 
    overdueFollowUps,
    createFollowUp,
    markFollowUpComplete 
  } = useCustomerService();

  const followUpTypes = [
    { value: 'booking_confirmation', label: 'تأكيد الحجز' },
    { value: 'payment_reminder', label: 'تذكير بالدفع' },
    { value: 'pre_arrival_2days', label: 'قبل الوصول بيومين' },
    { value: 'pre_arrival_1day', label: 'قبل الوصول بيوم' },
    { value: 'arrival_day', label: 'يوم الوصول' },
    { value: 'post_checkout', label: 'بعد المغادرة' },
    { value: 'satisfaction_survey', label: 'استطلاع الرضا' },
    { value: 'upsell_opportunity', label: 'عرض خدمات إضافية' },
    { value: 'loyalty_offers', label: 'عروض الولاء' },
    { value: 'passport_renewal', label: 'تجديد جواز السفر' },
    { value: 'complaint_followup', label: 'متابعة شكوى' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'منخفضة', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'عادية', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'عالية', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'عاجلة', color: 'bg-red-100 text-red-800' }
  ];

  const getSelectedCustomersData = () => {
    return customers.filter(customer => selectedCustomers.includes(customer.id));
  };

  const handleCreateFollowUp = async () => {
    const selectedCustomersData = getSelectedCustomersData();
    
    for (const customer of selectedCustomersData) {
      try {
        await createFollowUp({
          customer_id: customer.id,
          follow_up_type: followUpType,
          scheduled_date: scheduledDate,
          priority: priority,
          notes: notes
        });
      } catch (error) {
        console.error('خطأ في إنشاء المتابعة:', error);
      }
    }

    // إعادة تعيين النموذج
    setFollowUpType("");
    setScheduledDate("");
    setPriority("normal");
    setNotes("");
    setIsDialogOpen(false);
  };

  const getTodayTasksCount = () => {
    return todayFollowUps?.length || 0;
  };

  const getOverdueTasksCount = () => {
    return overdueFollowUps?.length || 0;
  };

  return (
    <div className="space-y-6">
      {/* ملخص المتابعات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getTodayTasksCount()}</p>
                <p className="text-sm text-gray-600">متابعات اليوم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getOverdueTasksCount()}</p>
                <p className="text-sm text-gray-600">متابعات متأخرة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedCustomers.length}</p>
                <p className="text-sm text-gray-600">عملاء محددين</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إنشاء متابعة جديدة */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            إدارة متابعات العملاء
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={selectedCustomers.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                إضافة متابعة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إنشاء متابعة جديدة</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedCustomers.length > 0 && (
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      ستتم إضافة المتابعة لـ {selectedCustomers.length} عميل محدد
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">نوع المتابعة</label>
                  <Select value={followUpType} onValueChange={setFollowUpType}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المتابعة" />
                    </SelectTrigger>
                    <SelectContent>
                      {followUpTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">تاريخ المتابعة</label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">الأولوية</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">ملاحظات</label>
                  <Textarea
                    placeholder="أضف ملاحظات للمتابعة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCreateFollowUp}
                    disabled={!followUpType || !scheduledDate}
                    className="flex-1"
                  >
                    إنشاء المتابعة
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {selectedCustomers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              اختر عملاء من الجدول لإنشاء متابعات لهم
            </p>
          ) : (
            <div className="space-y-3">
              <h4 className="font-medium">العملاء المحددين ({selectedCustomers.length}):</h4>
              <div className="flex flex-wrap gap-2">
                {getSelectedCustomersData().map(customer => (
                  <Badge key={customer.id} variant="secondary">
                    {customer.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* متابعات اليوم */}
      {todayFollowUps && todayFollowUps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              متابعات اليوم ({todayFollowUps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayFollowUps.map((followUp: any) => (
                <div key={followUp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{followUp.customer?.name}</p>
                      <p className="text-sm text-gray-600">
                        {followUpTypes.find(t => t.value === followUp.follow_up_type)?.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={priorityOptions.find(p => p.value === followUp.priority)?.color}>
                      {priorityOptions.find(p => p.value === followUp.priority)?.label}
                    </Badge>
                    {followUp.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => markFollowUpComplete(followUp.id)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        مكتمل
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerFollowUpManager;
