import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Save, 
  X, 
  Image as ImageIcon,
  Settings,
  Layout,
  Palette,
  Upload
} from 'lucide-react';
import { useLandingContent, LandingContent } from '@/hooks/useLandingContent';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LandingPageCMS = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const {
    content,
    settings,
    isLoading,
    updateContent,
    addContent,
    deleteContent,
    updateSetting,
    getSetting,
    getContentBySection
  } = useLandingContent();

  const [editingContent, setEditingContent] = useState<LandingContent | null>(null);
  const [newContent, setNewContent] = useState<any>({
    section: '',
    title: '',
    content: '',
    section_type: 'text',
    order_index: 0,
    is_active: true
  });
  const [showAddDialog, setShowAddDialog] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            غير مسموح بالوصول
          </h2>
          <p className="text-gray-600">
            هذه الصفحة متاحة للسوبر أدمن فقط
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const handleSaveContent = () => {
    if (editingContent) {
      updateContent(editingContent);
      setEditingContent(null);
    }
  };

  const handleAddContent = () => {
    addContent(newContent);
    setNewContent({
      section: '',
      title: '',
      content: '',
      section_type: 'text',
      order_index: 0,
      is_active: true
    });
    setShowAddDialog(false);
  };

  const handleDeleteContent = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
      deleteContent(id);
    }
  };

  const ContentEditor = ({ content: item }: { content: LandingContent }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{item.title}</CardTitle>
            <Badge variant={item.section_type === 'hero' ? 'default' : 'secondary'}>
              {item.section}
            </Badge>
            <Badge variant={item.is_active ? 'default' : 'secondary'}>
              {item.is_active ? 'نشط' : 'غير نشط'}
            </Badge>
          </div>
          <div className="flex gap-2">
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
              onClick={() => handleDeleteContent(item.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm mb-2">المحتوى:</p>
        <p className="text-gray-800">{item.content}</p>
        {item.image_url && (
          <div className="mt-3">
            <p className="text-gray-600 text-sm mb-1">الصورة:</p>
            <img 
              src={item.image_url} 
              alt={item.title}
              className="w-32 h-20 object-cover rounded border"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const SiteSettingsPanel = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settings?.map((setting) => (
          <Card key={setting.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{setting.description}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={setting.setting_value}
                  onChange={(e) => {
                    const updatedSettings = settings.map(s => 
                      s.id === setting.id 
                        ? { ...s, setting_value: e.target.value }
                        : s
                    );
                  }}
                  placeholder={`أدخل ${setting.description}`}
                />
                <Button
                  size="sm"
                  onClick={() => updateSetting({ 
                    key: setting.setting_key, 
                    value: setting.setting_value 
                  })}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">إدارة صفحة الهبوط</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.open('/', '_blank')} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            معاينة الصفحة
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                إضافة محتوى جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة محتوى جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="section">القسم</Label>
                    <Input
                      id="section"
                      value={newContent.section}
                      onChange={(e) => setNewContent({ ...newContent, section: e.target.value })}
                      placeholder="مثل: hero, services, contact"
                    />
                  </div>
                  <div>
                    <Label htmlFor="section_type">نوع القسم</Label>
                    <Select
                      value={newContent.section_type}
                      onValueChange={(value) => setNewContent({ ...newContent, section_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hero">صفحة رئيسية</SelectItem>
                        <SelectItem value="section">قسم</SelectItem>
                        <SelectItem value="heading">عنوان</SelectItem>
                        <SelectItem value="paragraph">فقرة</SelectItem>
                        <SelectItem value="text">نص</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="title">العنوان</Label>
                  <Input
                    id="title"
                    value={newContent.title}
                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="content">المحتوى</Label>
                  <Textarea
                    id="content"
                    value={newContent.content}
                    onChange={(e) => setNewContent({ ...newContent, content: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order_index">ترتيب العرض</Label>
                    <Input
                      id="order_index"
                      type="number"
                      value={newContent.order_index}
                      onChange={(e) => setNewContent({ ...newContent, order_index: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={newContent.is_active}
                      onCheckedChange={(checked) => setNewContent({ ...newContent, is_active: checked })}
                    />
                    <Label htmlFor="is_active">نشط</Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddContent}>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    <X className="h-4 w-4 mr-2" />
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            المحتوى
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            الصور
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            التصميم
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>محتوى الصفحة ({content?.length || 0} عنصر)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {content?.map((item) => (
                  <ContentEditor key={item.id} content={item} />
                ))}
                {!content?.length && (
                  <div className="text-center py-8 text-gray-500">
                    <Layout className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>لا يوجد محتوى حالياً</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إدارة الصور</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">اسحب وأسقط الصور هنا أو</p>
                <Button variant="outline">
                  اختر الصور
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الموقع</CardTitle>
            </CardHeader>
            <CardContent>
              <SiteSettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات التصميم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>اللون الأساسي</Label>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        type="color" 
                        value={getSetting('primary_color') || '#3B82F6'}
                        onChange={(e) => updateSetting({ key: 'primary_color', value: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input 
                        value={getSetting('primary_color') || '#3B82F6'}
                        onChange={(e) => updateSetting({ key: 'primary_color', value: e.target.value })}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>اللون الثانوي</Label>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        type="color" 
                        value={getSetting('secondary_color') || '#8B5CF6'}
                        onChange={(e) => updateSetting({ key: 'secondary_color', value: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input 
                        value={getSetting('secondary_color') || '#8B5CF6'}
                        onChange={(e) => updateSetting({ key: 'secondary_color', value: e.target.value })}
                        placeholder="#8B5CF6"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* محرر المحتوى المنبثق */}
      {editingContent && (
        <Dialog open={!!editingContent} onOpenChange={() => setEditingContent(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تعديل المحتوى: {editingContent.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-section">القسم</Label>
                  <Input
                    id="edit-section"
                    value={editingContent.section}
                    onChange={(e) => setEditingContent({ ...editingContent, section: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-section-type">نوع القسم</Label>
                  <Select
                    value={editingContent.section_type}
                    onValueChange={(value) => setEditingContent({ ...editingContent, section_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hero">صفحة رئيسية</SelectItem>
                      <SelectItem value="section">قسم</SelectItem>
                      <SelectItem value="heading">عنوان</SelectItem>
                      <SelectItem value="paragraph">فقرة</SelectItem>
                      <SelectItem value="text">نص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-title">العنوان</Label>
                <Input
                  id="edit-title"
                  value={editingContent.title}
                  onChange={(e) => setEditingContent({ ...editingContent, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-content">المحتوى</Label>
                <Textarea
                  id="edit-content"
                  value={editingContent.content}
                  onChange={(e) => setEditingContent({ ...editingContent, content: e.target.value })}
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-image-url">رابط الصورة</Label>
                  <Input
                    id="edit-image-url"
                    value={editingContent.image_url || ''}
                    onChange={(e) => setEditingContent({ ...editingContent, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-button-text">نص الزر</Label>
                  <Input
                    id="edit-button-text"
                    value={editingContent.button_text || ''}
                    onChange={(e) => setEditingContent({ ...editingContent, button_text: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-order">ترتيب العرض</Label>
                  <Input
                    id="edit-order"
                    type="number"
                    value={editingContent.order_index}
                    onChange={(e) => setEditingContent({ ...editingContent, order_index: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-active"
                    checked={editingContent.is_active}
                    onCheckedChange={(checked) => setEditingContent({ ...editingContent, is_active: checked })}
                  />
                  <Label htmlFor="edit-active">نشط</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveContent}>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ التغييرات
                </Button>
                <Button variant="outline" onClick={() => setEditingContent(null)}>
                  <X className="h-4 w-4 mr-2" />
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LandingPageCMS;