
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Image, 
  FileText, 
  Users, 
  Phone,
  Mail,
  Eye,
  Edit,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  const [content, setContent] = useState<LandingContent[]>([]);
  const [editingContent, setEditingContent] = useState<LandingContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && isSuperAdmin()) {
      fetchServiceRequests();
      fetchLandingContent();
    }
  }, [user]);

  const fetchServiceRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('خطأ في تحميل الطلبات');
    }
  };

  const fetchLandingContent = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_content')
        .select('*')
        .order('section');

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('خطأ في تحميل المحتوى');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      setRequests(prev => 
        prev.map(req => 
          req.id === id ? { ...req, status } : req
        )
      );
      
      toast.success('تم تحديث حالة الطلب');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('خطأ في تحديث الحالة');
    }
  };

  const saveContent = async (contentData: LandingContent) => {
    try {
      if (contentData.id) {
        const { error } = await supabase
          .from('landing_content')
          .update(contentData)
          .eq('id', contentData.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('landing_content')
          .insert([contentData]);
        
        if (error) throw error;
      }

      await fetchLandingContent();
      setEditingContent(null);
      toast.success('تم حفظ المحتوى بنجاح');
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('خطأ في حفظ المحتوى');
    }
  };

  const deleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('landing_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchLandingContent();
      toast.success('تم حذف المحتوى');
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('خطأ في حذف المحتوى');
    }
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">جارٍ تحميل البيانات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">إدارة صفحة الهبوط</h1>
        <Button onClick={() => window.open('/landing', '_blank')} variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          معاينة الصفحة
        </Button>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            طلبات الخدمة
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
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                طلبات الخدمة ({requests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
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
                          {request.status === 'pending' ? 'قيد الانتظار' :
                           request.status === 'contacted' ? 'تم التواصل' : 'مكتمل'}
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
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>نوع الخدمة:</strong> {request.service_type}
                      </div>
                      <div>
                        <strong>طريقة التواصل المفضلة:</strong> {request.preferred_contact}
                      </div>
                    </div>
                    
                    {request.message && (
                      <div className="mt-3">
                        <strong className="text-sm">الرسالة:</strong>
                        <p className="text-sm text-gray-600 mt-1">{request.message}</p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-3">
                      تاريخ الطلب: {new Date(request.created_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                ))}
                
                {requests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد طلبات حالياً
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
