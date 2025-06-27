import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  FileText, 
  Users, 
  Phone,
  Mail,
  Eye,
  Edit,
  Save,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface ServiceRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string;
  message: string;
  preferred_contact: string;
  created_at: string;
  status: string;
}

interface LandingContent {
  id?: string;
  section: string;
  title: string;
  content: string;
  image_url?: string;
  is_active: boolean;
}

const LandingAdmin = () => {
  const { user, isSuperAdmin } = useOptimizedAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [content, setContent] = useState<LandingContent[]>([
    {
      id: '1',
      section: 'hero',
      title: 'العنوان الرئيسي',
      content: 'رحلتك المميزة تبدأ من هنا',
      is_active: true
    }
  ]);
  const [editingContent, setEditingContent] = useState<LandingContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // تحميل الطلبات من localStorage
  useEffect(() => {
    const loadRequests = () => {
      try {
        const savedRequests = localStorage.getItem('vogatchi_service_requests');
        if (savedRequests) {
          const parsedRequests = JSON.parse(savedRequests);
          console.log('📋 Loaded service requests:', parsedRequests);
          setRequests(parsedRequests);
        }
      } catch (error) {
        console.error('❌ Error loading requests:', error);
      }
    };

    loadRequests();
    
    // تحديث كل 30 ثانية
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateRequestStatus = (id: string, status: string) => {
    try {
      const updatedRequests = requests.map(req => 
        req.id === id ? { ...req, status } : req
      );
      
      setRequests(updatedRequests);
      localStorage.setItem('vogatchi_service_requests', JSON.stringify(updatedRequests));
      
      toast.success('تم تحديث حالة الطلب');
    } catch (error) {
      console.error('❌ Error updating request status:', error);
      toast.error('حدث خطأ في تحديث حالة الطلب');
    }
  };

  const deleteRequest = (id: string) => {
    try {
      const updatedRequests = requests.filter(req => req.id !== id);
      setRequests(updatedRequests);
      localStorage.setItem('vogatchi_service_requests', JSON.stringify(updatedRequests));
      toast.success('تم حذف الطلب');
    } catch (error) {
      console.error('❌ Error deleting request:', error);
      toast.error('حدث خطأ في حذف الطلب');
    }
  };

  const refreshRequests = () => {
    try {
      const savedRequests = localStorage.getItem('vogatchi_service_requests');
      if (savedRequests) {
        const parsedRequests = JSON.parse(savedRequests);
        setRequests(parsedRequests);
        toast.success('تم تحديث قائمة الطلبات');
      }
    } catch (error) {
      console.error('❌ Error refreshing requests:', error);
      toast.error('حدث خطأ في تحديث القائمة');
    }
  };

  const saveContent = (contentData: LandingContent) => {
    if (contentData.id) {
      setContent(prev => prev.map(item => 
        item.id === contentData.id ? contentData : item
      ));
    } else {
      setContent(prev => [...prev, { ...contentData, id: Date.now().toString() }]);
    }
    setEditingContent(null);
    toast.success('تم حفظ المحتوى بنجاح');
  };

  const deleteContent = (id: string) => {
    setContent(prev => prev.filter(item => item.id !== id));
    toast.success('تم حذف المحتوى');
  };

  if (!user || !isSuperAdmin()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              غير مسموح بالوصول
            </h2>
            <p className="text-gray-600">
              هذه الصفحة متاحة للمديرين فقط
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getServiceTypeLabel = (type: string) => {
    const types = {
      'hotel': 'حجز فندق',
      'flight': 'حجز طيران', 
      'package': 'باقة سياحية',
      'transport': 'نقل ومواصلات',
      'other': 'أخرى'
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusLabel = (status: string) => {
    const statuses = {
      'pending': 'قيد الانتظار',
      'contacted': 'تم التواصل',
      'completed': 'مكتمل'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">إدارة صفحة الهبوط</h1>
        <Button onClick={() => window.open('/', '_blank')} variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          معاينة الصفحة
        </Button>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            طلبات الخدمة ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            إدارة المحتوى
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  طلبات الخدمة ({requests.length})
                </CardTitle>
                <Button onClick={refreshRequests} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  تحديث
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{request.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {request.phone}
                          </div>
                          {request.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {request.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={request.status === 'pending' ? 'secondary' : 
                                     request.status === 'contacted' ? 'default' : 'outline'}>
                          {getStatusLabel(request.status)}
                        </Badge>
                        <select
                          value={request.status}
                          onChange={(e) => updateRequestStatus(request.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="pending">قيد الانتظار</option>
                          <option value="contacted">تم التواصل</option>
                          <option value="completed">مكتمل</option>
                        </select>
                        <Button
                          onClick={() => deleteRequest(request.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <strong>نوع الخدمة:</strong> {getServiceTypeLabel(request.service_type)}
                      </div>
                      <div>
                        <strong>طريقة التواصل المفضلة:</strong> {request.preferred_contact}
                      </div>
                    </div>
                    
                    {request.message && (
                      <div className="mb-3">
                        <strong className="text-sm">الرسالة:</strong>
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">{request.message}</p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      تاريخ الطلب: {new Date(request.created_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                ))}
                
                {requests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد طلبات حالياً</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">إدارة محتوى الصفحة</h2>
            <Button onClick={() => setEditingContent({
              section: '',
              title: '',
              content: '',
              image_url: '',
              is_active: true
            })}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة محتوى جديد
            </Button>
          </div>

          <div className="grid gap-4">
            {content.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{item.section}</Badge>
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>
                          {item.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{item.title}</h3>
                      <p className="text-gray-600 text-sm">{item.content}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingContent(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => item.id && deleteContent(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {editingContent && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingContent.id ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">القسم</label>
                    <Input
                      value={editingContent.section}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        section: e.target.value
                      })}
                      placeholder="مثل: hero, services, hotels"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">العنوان</label>
                    <Input
                      value={editingContent.title}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        title: e.target.value
                      })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">المحتوى</label>
                  <Textarea
                    value={editingContent.content}
                    onChange={(e) => setEditingContent({
                      ...editingContent,
                      content: e.target.value
                    })}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">رابط الصورة</label>
                  <Input
                    value={editingContent.image_url || ''}
                    onChange={(e) => setEditingContent({
                      ...editingContent,
                      image_url: e.target.value
                    })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingContent.is_active}
                    onChange={(e) => setEditingContent({
                      ...editingContent,
                      is_active: e.target.checked
                    })}
                  />
                  <label className="text-sm">نشط</label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => saveContent(editingContent)}>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingContent(null)}
                  >
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات الصفحة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">معلومات الاتصال</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                      <Input defaultValue="+20 100 123 4567" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                      <Input defaultValue="info@vogatchi.com" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">إعدادات عامة</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">تفعيل نموذج طلب الخدمة</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">عرض قسم فنادق القاهرة</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">تفعيل الإشعارات للطلبات الجديدة</span>
                    </label>
                  </div>
                </div>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ الإعدادات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandingAdmin;
