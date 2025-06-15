
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Phone, MessageSquare, Mail, Calendar, Clock, User, 
  Plus, Filter, Search, CheckCircle, AlertCircle, 
  Star, TrendingUp, TrendingDown, MoreHorizontal
} from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { toast } from 'sonner';

interface Interaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'call' | 'whatsapp' | 'email' | 'meeting';
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'scheduled' | 'missed' | 'cancelled';
  subject: string;
  content: string;
  duration?: number;
  scheduledAt?: Date;
  completedAt?: Date;
  handledBy: string;
  rating?: number;
  followUpRequired: boolean;
  tags: string[];
  createdAt: Date;
}

const CustomerInteractions = () => {
  const { customers } = useCustomers();
  const [interactions, setInteractions] = useState<Interaction[]>([
    {
      id: '1',
      customerId: 'customer1',
      customerName: 'أحمد محمد',
      type: 'call',
      direction: 'inbound',
      status: 'completed',
      subject: 'استفسار عن حجز فندق',
      content: 'العميل يريد معرفة أسعار الفنادق في دبي لشهر مارس',
      duration: 15,
      completedAt: new Date(2024, 2, 15, 10, 30),
      handledBy: 'سارة أحمد',
      rating: 5,
      followUpRequired: true,
      tags: ['حجز فندق', 'دبي', 'مارس'],
      createdAt: new Date(2024, 2, 15, 10, 15)
    },
    {
      id: '2',
      customerId: 'customer2',
      customerName: 'فاطمة علي',
      type: 'whatsapp',
      direction: 'outbound',
      status: 'completed',
      subject: 'متابعة حجز الطيران',
      content: 'تأكيد تفاصيل حجز الطيران وإرسال تذاكر السفر',
      completedAt: new Date(2024, 2, 14, 14, 20),
      handledBy: 'محمد خالد',
      rating: 4,
      followUpRequired: false,
      tags: ['طيران', 'تأكيد', 'تذاكر'],
      createdAt: new Date(2024, 2, 14, 14, 15)
    },
    {
      id: '3',
      customerId: 'customer3',
      customerName: 'خالد السعيد',
      type: 'email',
      direction: 'outbound',
      status: 'scheduled',
      subject: 'عرض خاص لباقة العمرة',
      content: 'إرسال عرض خاص لباقة العمرة مع خصم 20%',
      scheduledAt: new Date(2024, 2, 16, 9, 0),
      handledBy: 'ليلى حسن',
      followUpRequired: true,
      tags: ['عمرة', 'عرض خاص', 'خصم'],
      createdAt: new Date(2024, 2, 15, 16, 30)
    }
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newInteraction, setNewInteraction] = useState({
    customerId: '',
    type: 'call' as 'call' | 'whatsapp' | 'email' | 'meeting',
    direction: 'outbound' as 'inbound' | 'outbound',
    subject: '',
    content: '',
    scheduledAt: '',
    handledBy: '',
    tags: ''
  });

  const handleCreateInteraction = () => {
    if (!newInteraction.customerId || !newInteraction.subject) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const customer = customers?.find(c => c.id === newInteraction.customerId);
    
    const interaction: Interaction = {
      id: Date.now().toString(),
      customerId: newInteraction.customerId,
      customerName: customer?.name || 'غير محدد',
      type: newInteraction.type,
      direction: newInteraction.direction,
      status: newInteraction.scheduledAt ? 'scheduled' : 'completed',
      subject: newInteraction.subject,
      content: newInteraction.content,
      scheduledAt: newInteraction.scheduledAt ? new Date(newInteraction.scheduledAt) : undefined,
      completedAt: !newInteraction.scheduledAt ? new Date() : undefined,
      handledBy: newInteraction.handledBy || 'المستخدم الحالي',
      followUpRequired: false,
      tags: newInteraction.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      createdAt: new Date()
    };

    setInteractions(prev => [interaction, ...prev]);
    
    setNewInteraction({
      customerId: '',
      type: 'call',
      direction: 'outbound',
      subject: '',
      content: '',
      scheduledAt: '',
      handledBy: '',
      tags: ''
    });
    setIsCreateDialogOpen(false);
    toast.success('تم تسجيل التفاعل بنجاح');
  };

  const filteredInteractions = interactions.filter(interaction => {
    const matchesStatus = filterStatus === 'all' || interaction.status === filterStatus;
    const matchesType = filterType === 'all' || interaction.type === filterType;
    const matchesSearch = searchTerm === '' || 
      interaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'missed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? 
      <TrendingDown className="h-3 w-3 text-blue-600" /> : 
      <TrendingUp className="h-3 w-3 text-green-600" />;
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // حساب الإحصائيات
  const stats = {
    total: interactions.length,
    completed: interactions.filter(i => i.status === 'completed').length,
    scheduled: interactions.filter(i => i.status === 'scheduled').length,
    avgRating: interactions.filter(i => i.rating).reduce((sum, i) => sum + (i.rating || 0), 0) / 
               interactions.filter(i => i.rating).length || 0,
    followUpRequired: interactions.filter(i => i.followUpRequired).length
  };

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي التفاعلات</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">مكتملة</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">مجدولة</p>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">متوسط التقييم</p>
                <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* رأس القسم والفلاتر */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">تفاعلات العملاء</h2>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                تسجيل تفاعل جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>تسجيل تفاعل جديد مع عميل</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">العميل</Label>
                    <Select 
                      value={newInteraction.customerId} 
                      onValueChange={(value) => setNewInteraction(prev => ({ ...prev, customerId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العميل" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="type">نوع التفاعل</Label>
                    <Select 
                      value={newInteraction.type} 
                      onValueChange={(value: any) => setNewInteraction(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">مكالمة هاتفية</SelectItem>
                        <SelectItem value="whatsapp">واتساب</SelectItem>
                        <SelectItem value="email">بريد إلكتروني</SelectItem>
                        <SelectItem value="meeting">اجتماع</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="direction">الاتجاه</Label>
                    <Select 
                      value={newInteraction.direction} 
                      onValueChange={(value: any) => setNewInteraction(prev => ({ ...prev, direction: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">واردة</SelectItem>
                        <SelectItem value="outbound">صادرة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="handled-by">تم التعامل بواسطة</Label>
                    <Input
                      id="handled-by"
                      value={newInteraction.handledBy}
                      onChange={(e) => setNewInteraction(prev => ({ ...prev, handledBy: e.target.value }))}
                      placeholder="اسم الموظف"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">الموضوع</Label>
                  <Input
                    id="subject"
                    value={newInteraction.subject}
                    onChange={(e) => setNewInteraction(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="موضوع التفاعل"
                  />
                </div>

                <div>
                  <Label htmlFor="content">المحتوى</Label>
                  <Textarea
                    id="content"
                    value={newInteraction.content}
                    onChange={(e) => setNewInteraction(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="تفاصيل التفاعل..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduled-at">موعد مجدول (اختياري)</Label>
                    <Input
                      id="scheduled-at"
                      type="datetime-local"
                      value={newInteraction.scheduledAt}
                      onChange={(e) => setNewInteraction(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tags">العلامات (مفصولة بفواصل)</Label>
                    <Input
                      id="tags"
                      value={newInteraction.tags}
                      onChange={(e) => setNewInteraction(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="حجز, فندق, استفسار"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateInteraction} className="flex-1">
                    تسجيل التفاعل
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* فلاتر البحث */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث في التفاعلات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="scheduled">مجدولة</SelectItem>
            <SelectItem value="missed">فائتة</SelectItem>
            <SelectItem value="cancelled">ملغية</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            <SelectItem value="call">مكالمات</SelectItem>
            <SelectItem value="whatsapp">واتساب</SelectItem>
            <SelectItem value="email">بريد إلكتروني</SelectItem>
            <SelectItem value="meeting">اجتماعات</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* قائمة التفاعلات */}
      <div className="space-y-4">
        {filteredInteractions.map((interaction) => (
          <Card key={interaction.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {interaction.customerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{interaction.customerName}</h4>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(interaction.type)}
                        {getDirectionIcon(interaction.direction)}
                      </div>
                      <Badge className={getStatusColor(interaction.status)}>
                        {interaction.status === 'completed' && 'مكتملة'}
                        {interaction.status === 'scheduled' && 'مجدولة'}
                        {interaction.status === 'missed' && 'فائتة'}
                        {interaction.status === 'cancelled' && 'ملغية'}
                      </Badge>
                    </div>
                    
                    <p className="font-medium text-sm mb-1">{interaction.subject}</p>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{interaction.content}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{interaction.handledBy}</span>
                      </div>
                      
                      {interaction.completedAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(interaction.completedAt)}</span>
                        </div>
                      )}
                      
                      {interaction.scheduledAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDateTime(interaction.scheduledAt)}</span>
                        </div>
                      )}
                      
                      {interaction.duration && (
                        <span>{interaction.duration} دقيقة</span>
                      )}
                    </div>
                    
                    {interaction.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {interaction.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {interaction.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{interaction.rating}</span>
                    </div>
                  )}
                  
                  {interaction.followUpRequired && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      يحتاج متابعة
                    </Badge>
                  )}
                  
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInteractions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد تفاعلات</h3>
            <p className="text-gray-600 mb-4">
              لم يتم العثور على تفاعلات تطابق المعايير المحددة
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              تسجيل تفاعل جديد
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerInteractions;
