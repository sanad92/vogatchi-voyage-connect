
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Zap, 
  Edit, 
  Trash2, 
  Copy,
  Globe,
  User
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
  is_global: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface QuickReplyFormData {
  title: string;
  content: string;
  category: string;
  is_global: boolean;
}

export const WhatsAppQuickReplies: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [formData, setFormData] = useState<QuickReplyFormData>({
    title: '',
    content: '',
    category: 'general',
    is_global: true
  });

  // جلب الردود السريعة
  const { data: quickReplies = [], isLoading } = useQuery({
    queryKey: ['whatsapp-quick-replies'],
    queryFn: async (): Promise<QuickReply[]> => {
      const { data, error } = await supabase
        .from('whatsapp_quick_replies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب الردود السريعة:', error);
        throw error;
      }

      return data as QuickReply[];
    },
    staleTime: 30000
  });

  // إنشاء رد سريع جديد
  const createQuickReplyMutation = useMutation({
    mutationFn: async (replyData: QuickReplyFormData) => {
      const { data, error } = await supabase
        .from('whatsapp_quick_replies')
        .insert([{
          ...replyData,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء رد سريع:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
      toast.success('تم إنشاء الرد السريع بنجاح');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('خطأ في إنشاء الرد السريع:', error);
      toast.error('فشل في إنشاء الرد السريع');
    }
  });

  // تحديث رد سريع
  const updateQuickReplyMutation = useMutation({
    mutationFn: async (replyData: QuickReplyFormData & { id: string }) => {
      const { id, ...updateData } = replyData;
      
      const { data, error } = await supabase
        .from('whatsapp_quick_replies')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('خطأ في تحديث رد سريع:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
      toast.success('تم تحديث الرد السريع بنجاح');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('خطأ في تحديث الرد السريع:', error);
      toast.error('فشل في تحديث الرد السريع');
    }
  });

  // حذف رد سريع
  const deleteQuickReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase
        .from('whatsapp_quick_replies')
        .delete()
        .eq('id', replyId);

      if (error) {
        console.error('خطأ في حذف رد سريع:', error);
        throw error;
      }

      return replyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
      toast.success('تم حذف الرد السريع بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في حذف الرد السريع:', error);
      toast.error('فشل في حذف الرد السريع');
    }
  });

  const categories = [
    'general',
    'greeting',
    'booking',
    'support',
    'closing'
  ];

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      is_global: true
    });
    setEditingReply(null);
  };

  const handleOpenDialog = (reply?: QuickReply) => {
    if (reply) {
      setEditingReply(reply);
      setFormData({
        title: reply.title || '',
        content: reply.content || '',
        category: reply.category || 'general',
        is_global: reply.is_global || false
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast.error('يرجى ملء العنوان والمحتوى');
      return;
    }

    if (editingReply) {
      updateQuickReplyMutation.mutate({
        id: editingReply.id,
        ...formData
      });
    } else {
      createQuickReplyMutation.mutate(formData);
    }
  };

  const handleDelete = async (replyId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرد السريع؟')) {
      return;
    }

    deleteQuickReplyMutation.mutate(replyId);
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('تم نسخ المحتوى');
  };

  const getCategoryName = (category: string) => {
    const categoryNames: Record<string, string> = {
      general: 'عام',
      greeting: 'ترحيب',
      booking: 'حجوزات',
      support: 'دعم',
      closing: 'إنهاء'
    };
    return categoryNames[category] || category;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" />
            الردود السريعة
          </h2>
          <p className="text-gray-600 mt-1">
            إدارة الردود السريعة لتسريع الاستجابة للعملاء
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              رد سريع جديد
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingReply ? 'تحرير الرد السريع' : 'إنشاء رد سريع جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">العنوان *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="مثال: ترحيب العملاء"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">التصنيف</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2 border rounded-md"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryName(cat)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="content">المحتوى *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="محتوى الرد السريع..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_global">رد عام</Label>
                  <p className="text-sm text-gray-500">
                    متاح لجميع الموظفين أم خاص بك فقط
                  </p>
                </div>
                <Switch
                  id="is_global"
                  checked={formData.is_global}
                  onCheckedChange={(checked) => setFormData({...formData, is_global: checked})}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={createQuickReplyMutation.isPending || updateQuickReplyMutation.isPending}
                >
                  {(createQuickReplyMutation.isPending || updateQuickReplyMutation.isPending) 
                    ? 'جاري الحفظ...' 
                    : 'حفظ الرد السريع'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickReplies.map((reply) => (
          <Card key={reply.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{reply.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{getCategoryName(reply.category)}</Badge>
                    {reply.is_global ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Globe className="w-3 h-3 mr-1" />
                        عام
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800">
                        <User className="w-3 h-3 mr-1" />
                        شخصي
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {reply.content}
                </div>
                
                <div className="text-xs text-gray-500">
                  تم الاستخدام: {reply.usage_count || 0} مرة
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyContent(reply.content)}
                    className="flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    نسخ
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(reply)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    تحرير
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(reply.id)}
                    disabled={deleteQuickReplyMutation.isPending}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    حذف
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {quickReplies.length === 0 && (
        <div className="text-center py-8">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد ردود سريعة</h3>
          <p className="text-gray-500 mb-4">ابدأ بإنشاء ردود سريعة لتسريع خدمة العملاء</p>
          <Button onClick={() => handleOpenDialog()}>
            إنشاء رد سريع
          </Button>
        </div>
      )}
    </div>
  );
};
