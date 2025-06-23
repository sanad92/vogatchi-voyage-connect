
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  Send,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TemplateFormData {
  name: string;
  category: string;
  language: string;
  header_type?: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  buttons?: any;
  variables?: any;
}

export const WhatsAppTemplateManager: React.FC = () => {
  const { templates, isLoading, error } = useWhatsAppTemplates();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    category: 'marketing',
    language: 'ar',
    body_text: '',
    footer_text: '',
    header_text: ''
  });

  // إنشاء قالب جديد
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateFormData) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert([{
          ...templateData,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء قالب:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('تم إنشاء القالب بنجاح');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('خطأ في إنشاء القالب:', error);
      toast.error('فشل في إنشاء القالب');
    }
  });

  // تحديث قالب
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateFormData & { id: string }) => {
      const { id, ...updateData } = templateData;
      
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('خطأ في تحديث قالب:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('تم تحديث القالب بنجاح');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('خطأ في تحديث القالب:', error);
      toast.error('فشل في تحديث القالب');
    }
  });

  // حذف قالب
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('خطأ في حذف قالب:', error);
        throw error;
      }

      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('تم حذف القالب بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في حذف القالب:', error);
      toast.error('فشل في حذف القالب');
    }
  });

  const categories = [
    { value: 'marketing', label: 'تسويق' },
    { value: 'utility', label: 'خدمات' },
    { value: 'authentication', label: 'التحقق' }
  ];

  const languages = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' },
    { value: 'en_US', label: 'English (US)' }
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'marketing',
      language: 'ar',
      body_text: '',
      footer_text: '',
      header_text: ''
    });
    setEditingTemplate(null);
  };

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name || '',
        category: template.category || 'marketing',
        language: template.language || 'ar',
        body_text: template.body_text || '',
        footer_text: template.footer_text || '',
        header_text: template.header_text || '',
        header_type: template.header_type || '',
        buttons: template.buttons,
        variables: template.variables
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.body_text) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        ...formData
      });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      return;
    }

    deleteTemplateMutation.mutate(templateId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'في الانتظار', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'مُعتمد', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={config.className}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getCategoryName = (category: string) => {
    const categoryNames: Record<string, string> = {
      marketing: 'تسويق',
      utility: 'خدمات',
      authentication: 'التحقق'
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

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">حدث خطأ في تحميل القوالب</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            قوالب الرسائل
          </h2>
          <p className="text-gray-600 mt-1">
            إدارة قوالب رسائل WhatsApp المُعتمدة
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              قالب جديد
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'تحرير القالب' : 'إنشاء قالب جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">اسم القالب *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="مثال: welcome_message"
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
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">اللغة</Label>
                  <select
                    id="language"
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                    className="w-full p-2 border rounded-md"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="header_text">نص الرأس</Label>
                  <Input
                    id="header_text"
                    value={formData.header_text}
                    onChange={(e) => setFormData({...formData, header_text: e.target.value})}
                    placeholder="نص الرأس (اختياري)"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="body_text">نص الرسالة *</Label>
                <Textarea
                  id="body_text"
                  value={formData.body_text}
                  onChange={(e) => setFormData({...formData, body_text: e.target.value})}
                  placeholder="محتوى الرسالة الأساسي..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="footer_text">نص التذييل</Label>
                <Input
                  id="footer_text"
                  value={formData.footer_text}
                  onChange={(e) => setFormData({...formData, footer_text: e.target.value})}
                  placeholder="نص التذييل (اختياري)"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  {(createTemplateMutation.isPending || updateTemplateMutation.isPending) 
                    ? 'جاري الحفظ...' 
                    : 'حفظ القالب'}
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
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{getCategoryName(template.category)}</Badge>
                    <Badge variant="outline">{template.language}</Badge>
                  </div>
                </div>
                {getStatusBadge(template.status)}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {template.header_text && (
                  <div className="text-sm text-gray-600">
                    <strong>الرأس:</strong> {template.header_text}
                  </div>
                )}
                
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {template.body_text}
                </div>
                
                {template.footer_text && (
                  <div className="text-xs text-gray-500">
                    {template.footer_text}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(template)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    تحرير
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleteTemplateMutation.isPending}
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

      {templates?.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد قوالب</h3>
          <p className="text-gray-500 mb-4">ابدأ بإنشاء قوالب رسائل لاستخدامها مع العملاء</p>
          <Button onClick={() => handleOpenDialog()}>
            إنشاء قالب جديد
          </Button>
        </div>
      )}
    </div>
  );
};
