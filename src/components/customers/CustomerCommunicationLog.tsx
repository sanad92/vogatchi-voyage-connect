import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar,
  Plus,
  Send,
  User
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomerCommunicationLogProps {
  customerId: string;
}

interface Communication {
  id: string;
  communication_type: string;
  direction: string;
  content: string;
  created_at: string;
  handled_by: string;
  status: string;
  duration_minutes?: number;
}

const CustomerCommunicationLog = ({ customerId }: CustomerCommunicationLogProps) => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCommunication, setNewCommunication] = useState({
    type: '',
    content: '',
    direction: 'outgoing'
  });

  useEffect(() => {
    fetchCommunications();
  }, [customerId]);

  const fetchCommunications = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('customer_communications')
        .select(`
          *,
          handled_by_profile:profiles!customer_communications_handled_by_fkey(full_name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast.error('حدث خطأ في تحميل سجل التواصل');
    } finally {
      setIsLoading(false);
    }
  };

  const addCommunication = async () => {
    if (!newCommunication.type || !newCommunication.content) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('يجب تسجيل الدخول لإضافة تواصل');
        return;
      }

      const { error } = await supabase
        .from('customer_communications')
        .insert({
          customer_id: customerId,
          communication_type: newCommunication.type,
          direction: newCommunication.direction,
          content: newCommunication.content,
          handled_by: user.id,
          status: 'completed'
        });

      if (error) throw error;

      toast.success('تم إضافة سجل التواصل بنجاح');
      setNewCommunication({ type: '', content: '', direction: 'outgoing' });
      setShowAddForm(false);
      fetchCommunications();
    } catch (error) {
      console.error('Error adding communication:', error);
      toast.error('حدث خطأ في إضافة سجل التواصل');
    }
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCommunicationTypeLabel = (type: string) => {
    const types = {
      phone: 'مكالمة هاتفية',
      email: 'بريد إلكتروني',
      whatsapp: 'واتساب',
      meeting: 'اجتماع',
      sms: 'رسالة نصية'
    };
    return types[type] || type;
  };

  const getDirectionLabel = (direction: string) => {
    return direction === 'incoming' ? 'واردة' : 'صادرة';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-2">جاري تحميل سجل التواصل...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Communication Form */}
      {showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة سجل تواصل جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">نوع التواصل</label>
                <Select 
                  value={newCommunication.type} 
                  onValueChange={(value) => setNewCommunication({...newCommunication, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع التواصل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">مكالمة هاتفية</SelectItem>
                    <SelectItem value="email">بريد إلكتروني</SelectItem>
                    <SelectItem value="whatsapp">واتساب</SelectItem>
                    <SelectItem value="meeting">اجتماع</SelectItem>
                    <SelectItem value="sms">رسالة نصية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">الاتجاه</label>
                <Select 
                  value={newCommunication.direction} 
                  onValueChange={(value) => setNewCommunication({...newCommunication, direction: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outgoing">صادرة</SelectItem>
                    <SelectItem value="incoming">واردة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">المحتوى</label>
              <Textarea
                value={newCommunication.content}
                onChange={(e) => setNewCommunication({...newCommunication, content: e.target.value})}
                placeholder="اكتب تفاصيل التواصل..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addCommunication}>
                <Send className="h-4 w-4 mr-2" />
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة تواصل جديد
          </Button>
        </div>
      )}

      {/* Communications List */}
      {communications.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد سجل تواصل مع هذا العميل</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowAddForm(true)}>
              إضافة أول تواصل
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => (
            <Card key={comm.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {getCommunicationIcon(comm.communication_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getCommunicationTypeLabel(comm.communication_type)}
                        </span>
                        <Badge variant={comm.direction === 'incoming' ? 'secondary' : 'default'}>
                          {getDirectionLabel(comm.direction)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {formatDate(comm.created_at)}
                      </div>
                    </div>
                    
                    <div className="text-sm mb-2">
                      {comm.content}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        بواسطة: {(comm as any).handled_by_profile?.full_name || 'غير محدد'}
                      </div>
                      
                      {comm.duration_minutes && (
                        <div>
                          المدة: {comm.duration_minutes} دقيقة
                        </div>
                      )}
                      
                      <Badge variant="outline" className="text-xs">
                        {comm.status === 'completed' ? 'مكتمل' : 'معلق'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerCommunicationLog;