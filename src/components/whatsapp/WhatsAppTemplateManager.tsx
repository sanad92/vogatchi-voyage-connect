
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
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { toast } from 'sonner';

interface TemplateFormData {
  name: string;
  category: string;
  language: string;
  header_text: string;
  body_text: string;
  footer_text: string;
}

export const WhatsAppTemplateManager: React.FC = () => {
  const { 
    templates, 
    isLoading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    isCreating,
    isUpdating,
    isDeleting 
  } = useWhatsAppTemplates();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    category: 'UTILITY',
    language: 'ar',
    header_text: '',
    body_text: '',
    footer_text: ''
  });

  const categories = [
    { value: 'UTILITY', label: 'خدمات' },
    { value: 'MARKETING', label: 'تسويق' },
    { value: 'AUTHENTICATION', label: 'مصادقة' }
  ];

  const languages = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' }
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'UTILITY',
      language: 'ar',
      header_text: '',
      body_text: '',
      footer_text: ''
    });
    setEditingTemplate(null);
  };

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name || '',
        category: template.category || 'UTILITY',
        language: template.language || 'ar',
        header_text: template.header_text || '',
        body_text: template.body_text || '',
        footer_text: template.footer_text || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.body_text) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate({
          id: editingTemplate.id,
          ...formData
        });
        toast.success('تم تحديث القالب بنجاح');
      } else {
        await createTemplate(formData);
        toast.success('تم إنشاء القالب بنجاح');
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('خطأ في حفظ القالب:', error);
      toast.error('فشل في حفظ القالب');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      return;
    }

    try {
      await deleteTemplate(templateId);
      toast.success('تم حذف القالب بنجاح');
    } catch (error) {
      console.error('خطأ في حذف القالب:', error);
      toast.error('فشل في حذف القالب');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />معتمد</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />مرفوض</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />في الانتظار</Badge>;
    }
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
            <FileText className="w-6 h-6" />
            إدارة قوالب الرسائل
          </h2>
          <p className="text-gray-600 mt-1">
            إنشاء وإدارة قوالب رسائل WhatsApp Business
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
                    placeholder="مثال: booking_confirmation"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">التصنيف</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="language">اللغة</Label>
                <Select value={formData.language} onValueChange={(value) => setFormData({...formData, language: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="header_text">نص الرأس (اختياري)</Label>
                <Input
                  id="header_text"
                  value={formData.header_text}
                  onChange={(e) => setFormData({...formData, header_text: e.target.value})}
                  placeholder="رأس الرسالة..."
                />
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
                <Label htmlFor="footer_text">نص التذييل (اختياري)</Label>
                <Input
                  id="footer_text"
                  value={formData.footer_text}
                  onChange={(e) => setFormData({...formData, footer_text: e.target.value})}
                  placeholder="تذييل الرسالة..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) ? 'جاري الحفظ...' : 'حفظ القالب'}
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
                  <p className="text-sm text-gray-500">{template.category}</p>
                </div>
                {getStatusBadge(template.approval_status || 'pending')}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {template.header_text && (
                  <div className="bg-gray-50 p-2 rounded text-sm">
                    <strong>الرأس:</strong> {template.header_text}
                  </div>
                )}
                
                <div className="bg-blue-50 p-2 rounded text-sm">
                  <strong>المحتوى:</strong> {template.body_text.substring(0, 100)}
                  {template.body_text.length > 100 && '...'}
                </div>
                
                {template.footer_text && (
                  <div className="bg-gray-50 p-2 rounded text-sm">
                    <strong>التذييل:</strong> {template.footer_text}
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
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
                    disabled={isDeleting}
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
          <p className="text-gray-500 mb-4">ابدأ بإنشاء قالب رسالة جديد</p>
          <Button onClick={() => handleOpenDialog()}>
            إنشاء قالب جديد
          </Button>
        </div>
      )}
    </div>
  );
};
