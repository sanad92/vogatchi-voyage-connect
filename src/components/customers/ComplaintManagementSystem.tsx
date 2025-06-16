import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  Star,
  TrendingUp,
  Users,
  Plus,
  Filter,
  Search,
  Calendar,
  CreditCard,
  Phone
} from "lucide-react";
import { Customer } from "@/types/customer";

interface ComplaintManagementProps {
  customers: Customer[];
}

interface Complaint {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  category: 'service' | 'booking' | 'payment' | 'communication' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  satisfactionRating?: number;
  escalated: boolean;
  responseTime: number; // in hours
  resolutionTime?: number; // in hours
}

const ComplaintManagementSystem = ({ customers }: ComplaintManagementProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // بيانات وهمية للشكاوى
  const [complaints] = useState<Complaint[]>([
    {
      id: '1',
      customerId: 'customer-1',
      customerName: 'أحمد محمد',
      title: 'تأخير في تأكيد الحجز',
      description: 'لم يتم تأكيد الحجز بعد 24 ساعة من الدفع',
      category: 'booking',
      priority: 'high',
      status: 'in_progress',
      assignedTo: 'سارة أحمد',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T14:30:00Z',
      escalated: false,
      responseTime: 2
    },
    {
      id: '2',
      customerId: 'customer-2',
      customerName: 'فاطمة علي',
      title: 'مشكلة في الفاتورة',
      description: 'الفاتورة تحتوي على رسوم إضافية غير مبررة',
      category: 'payment',
      priority: 'medium',
      status: 'resolved',
      assignedTo: 'محمد خالد',
      createdAt: '2024-01-14T09:00:00Z',
      updatedAt: '2024-01-14T16:00:00Z',
      resolvedAt: '2024-01-14T16:00:00Z',
      resolution: 'تم تصحيح الفاتورة وإرجاع الرسوم الإضافية',
      satisfactionRating: 5,
      escalated: false,
      responseTime: 1,
      resolutionTime: 7
    },
    {
      id: '3',
      customerId: 'customer-3',
      customerName: 'عبدالله السالم',
      title: 'جودة الخدمة في الفندق',
      description: 'مستوى الخدمة في الفندق أقل من المتوقع',
      category: 'service',
      priority: 'medium',
      status: 'open',
      createdAt: '2024-01-16T08:00:00Z',
      updatedAt: '2024-01-16T08:00:00Z',
      escalated: false,
      responseTime: 0
    }
  ]);

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      service: MessageSquare,
      booking: Calendar,
      payment: CreditCard,
      communication: Phone,
      other: AlertTriangle
    };
    return icons[category as keyof typeof icons] || AlertTriangle;
  };

  const filteredComplaints = complaints.filter(complaint => {
    const statusMatch = filterStatus === 'all' || complaint.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || complaint.priority === filterPriority;
    const searchMatch = searchTerm === '' || 
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && priorityMatch && searchMatch;
  });

  // إحصائيات الشكاوى
  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'open').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    avgResponseTime: complaints.reduce((sum, c) => sum + c.responseTime, 0) / complaints.length,
    avgResolutionTime: complaints.filter(c => c.resolutionTime).reduce((sum, c) => sum + (c.resolutionTime || 0), 0) / complaints.filter(c => c.resolutionTime).length,
    satisfactionRate: complaints.filter(c => c.satisfactionRating).reduce((sum, c) => sum + (c.satisfactionRating || 0), 0) / complaints.filter(c => c.satisfactionRating).length
  };

  return (
    <div className="space-y-6">
      {/* إحصائيات الشكاوى */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="font-bold text-2xl">{stats.total}</p>
            <p className="text-sm text-gray-600">إجمالي الشكاوى</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="font-bold text-2xl">{stats.open + stats.inProgress}</p>
            <p className="text-sm text-gray-600">قيد المعالجة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="font-bold text-2xl">{stats.resolved}</p>
            <p className="text-sm text-gray-600">تم الحل</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Star className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="font-bold text-2xl">{stats.satisfactionRate.toFixed(1)}</p>
            <p className="text-sm text-gray-600">معدل الرضا</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            نظام إدارة الشكاوى
          </CardTitle>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                إضافة شكوى
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة شكوى جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">العميل</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العميل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_customer">بدون عميل محدد</SelectItem>
                        {customers.slice(0, 10).map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">الأولوية</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الأولوية" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">منخفضة</SelectItem>
                        <SelectItem value="medium">متوسطة</SelectItem>
                        <SelectItem value="high">عالية</SelectItem>
                        <SelectItem value="urgent">عاجلة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">عنوان الشكوى</label>
                  <Input placeholder="أدخل عنوان الشكوى" />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">تفاصيل الشكوى</label>
                  <Textarea 
                    placeholder="اكتب تفاصيل الشكوى..."
                    rows={4}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1">
                    إضافة الشكوى
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="complaints">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="complaints">الشكاوى</TabsTrigger>
              <TabsTrigger value="analytics">التحليلات</TabsTrigger>
              <TabsTrigger value="reports">التقارير</TabsTrigger>
            </TabsList>

            <TabsContent value="complaints" className="space-y-4">
              {/* فلاتر البحث */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="البحث في الشكاوى..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="حالة الشكوى" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="open">مفتوحة</SelectItem>
                    <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                    <SelectItem value="resolved">تم الحل</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأولويات</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="low">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* قائمة الشكاوى */}
              <div className="space-y-3">
                {filteredComplaints.map(complaint => {
                  const CategoryIcon = getCategoryIcon(complaint.category);
                  return (
                    <Card 
                      key={complaint.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <CategoryIcon className="h-5 w-5 text-gray-500 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{complaint.title}</h4>
                                {complaint.escalated && (
                                  <Badge variant="destructive" className="text-xs">
                                    مصعدة
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {complaint.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>العميل: {complaint.customerName}</span>
                                <span>الرقم: #{complaint.id}</span>
                                {complaint.assignedTo && (
                                  <span>مكلف: {complaint.assignedTo}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-2">
                              <Badge className={getStatusColor(complaint.status)}>
                                {complaint.status === 'open' ? 'مفتوحة' :
                                 complaint.status === 'in_progress' ? 'قيد المعالجة' :
                                 complaint.status === 'resolved' ? 'تم الحل' : 'مغلقة'}
                              </Badge>
                              <Badge className={getPriorityColor(complaint.priority)}>
                                {complaint.priority === 'urgent' ? 'عاجلة' :
                                 complaint.priority === 'high' ? 'عالية' :
                                 complaint.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                              </Badge>
                            </div>
                            
                            {complaint.satisfactionRating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs">{complaint.satisfactionRating}/5</span>
                              </div>
                            )}
                            
                            <span className="text-xs text-gray-500">
                              {new Date(complaint.createdAt).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>مؤشرات الأداء</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>متوسط وقت الاستجابة</span>
                      <span className="font-bold">{stats.avgResponseTime.toFixed(1)} ساعة</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>متوسط وقت الحل</span>
                      <span className="font-bold">{stats.avgResolutionTime.toFixed(1)} ساعة</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>معدل الرضا</span>
                      <span className="font-bold">{stats.satisfactionRate.toFixed(1)}/5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>معدل الحل</span>
                      <span className="font-bold">
                        {Math.round((stats.resolved / stats.total) * 100)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>توزيع الشكاوى حسب الفئة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {['service', 'booking', 'payment', 'communication', 'other'].map(category => {
                        const count = complaints.filter(c => c.category === category).length;
                        const percentage = (count / complaints.length) * 100;
                        const categoryName = {
                          service: 'الخدمة',
                          booking: 'الحجز',
                          payment: 'الدفع',
                          communication: 'التواصل',
                          other: 'أخرى'
                        }[category];
                        
                        return (
                          <div key={category} className="flex items-center justify-between">
                            <span className="text-sm">{categoryName}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm w-12 text-right">
                                {count} ({Math.round(percentage)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">تقارير تفصيلية ستكون متاحة قريباً</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplaintManagementSystem;
