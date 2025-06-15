
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Send, Plus, Users, MessageSquare, Mail, Phone, 
  Calendar, Target, TrendingUp, Play, Pause, Stop, Eye
} from 'lucide-react';
import { useCRM } from '@/hooks/useCRM';
import { useCustomers } from '@/hooks/useCustomers';
import { toast } from 'sonner';

const MarketingCampaigns = () => {
  const { customerSegments, marketingCampaigns, campaignsLoading, createCampaign } = useCRM();
  const { customers } = useCustomers();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'whatsapp' as 'email' | 'whatsapp' | 'sms',
    target_segment_id: '',
    message_template: '',
    start_date: '',
    end_date: ''
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.message_template) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    createCampaign({
      ...newCampaign,
      status: 'draft'
    });

    setNewCampaign({
      name: '',
      description: '',
      campaign_type: 'whatsapp',
      target_segment_id: '',
      message_template: '',
      start_date: '',
      end_date: ''
    });
    setIsCreateDialogOpen(false);
    toast.success('تم إنشاء الحملة بنجاح');
  };

  const getCampaignStats = (campaign: any) => {
    const targetCustomers = campaign.target_segment_id ? 
      customers?.filter(c => c.segment_id === campaign.target_segment_id).length || 0 :
      customers?.length || 0;
    
    return {
      targetAudience: targetCustomers,
      sent: Math.floor(targetCustomers * 0.8), // محاكاة
      delivered: Math.floor(targetCustomers * 0.75), // محاكاة
      opened: Math.floor(targetCustomers * 0.45), // محاكاة
      responded: Math.floor(targetCustomers * 0.12) // محاكاة
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الحملات</p>
                <p className="text-2xl font-bold">{marketingCampaigns?.length || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الحملات النشطة</p>
                <p className="text-2xl font-bold">
                  {marketingCampaigns?.filter(c => c.status === 'active').length || 0}
                </p>
              </div>
              <Play className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل الفتح</p>
                <p className="text-2xl font-bold">45%</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل الاستجابة</p>
                <p className="text-2xl font-bold">12%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* رأس القسم وزر إنشاء حملة جديدة */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">الحملات التسويقية</h2>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إنشاء حملة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء حملة تسويقية جديدة</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign-name">اسم الحملة</Label>
                  <Input
                    id="campaign-name"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل اسم الحملة"
                  />
                </div>
                
                <div>
                  <Label htmlFor="campaign-type">نوع الحملة</Label>
                  <Select 
                    value={newCampaign.campaign_type} 
                    onValueChange={(value: any) => setNewCampaign(prev => ({ ...prev, campaign_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">واتساب</SelectItem>
                      <SelectItem value="email">بريد إلكتروني</SelectItem>
                      <SelectItem value="sms">رسائل نصية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="campaign-description">وصف الحملة</Label>
                <Textarea
                  id="campaign-description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف مختصر للحملة وأهدافها"
                />
              </div>

              <div>
                <Label htmlFor="target-segment">الجمهور المستهدف</Label>
                <Select 
                  value={newCampaign.target_segment_id} 
                  onValueChange={(value) => setNewCampaign(prev => ({ ...prev, target_segment_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القطاع المستهدف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع العملاء</SelectItem>
                    {customerSegments?.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message-template">قالب الرسالة</Label>
                <Textarea
                  id="message-template"
                  value={newCampaign.message_template}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, message_template: e.target.value }))}
                  placeholder="اكتب محتوى الرسالة هنا..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">تاريخ البداية</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={newCampaign.start_date}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="end-date">تاريخ النهاية (اختياري)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={newCampaign.end_date}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateCampaign} className="flex-1">
                  إنشاء الحملة
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* قائمة الحملات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {marketingCampaigns?.map((campaign) => {
          const stats = getCampaignStats(campaign);
          const deliveryRate = stats.targetAudience > 0 ? (stats.delivered / stats.targetAudience) * 100 : 0;
          const openRate = stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0;
          const responseRate = stats.sent > 0 ? (stats.responded / stats.sent) * 100 : 0;

          return (
            <Card key={campaign.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(campaign.campaign_type)}
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status === 'active' && 'نشطة'}
                    {campaign.status === 'completed' && 'مكتملة'}
                    {campaign.status === 'paused' && 'متوقفة'}
                    {campaign.status === 'draft' && 'مسودة'}
                  </Badge>
                </div>
                {campaign.description && (
                  <p className="text-sm text-gray-600">{campaign.description}</p>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* إحصائيات الحملة */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">الجمهور المستهدف:</span>
                      <span className="font-medium">{stats.targetAudience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">تم الإرسال:</span>
                      <span className="font-medium">{stats.sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">تم التوصيل:</span>
                      <span className="font-medium">{stats.delivered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">تم الفتح:</span>
                      <span className="font-medium">{stats.opened}</span>
                    </div>
                  </div>

                  {/* معدلات الأداء */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>معدل التوصيل</span>
                      <span className="font-medium">{deliveryRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={deliveryRate} className="h-2" />
                    
                    <div className="flex justify-between text-sm">
                      <span>معدل الفتح</span>
                      <span className="font-medium">{openRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={openRate} className="h-2" />
                    
                    <div className="flex justify-between text-sm">
                      <span>معدل الاستجابة</span>
                      <span className="font-medium">{responseRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={responseRate} className="h-2" />
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex gap-2 pt-2">
                    {campaign.status === 'draft' && (
                      <Button size="sm" className="flex-1">
                        <Play className="h-3 w-3 mr-1" />
                        تشغيل
                      </Button>
                    )}
                    {campaign.status === 'active' && (
                      <Button size="sm" variant="outline" className="flex-1">
                        <Pause className="h-3 w-3 mr-1" />
                        إيقاف مؤقت
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1" />
                      عرض
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!marketingCampaigns || marketingCampaigns.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <Send className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد حملات تسويقية</h3>
            <p className="text-gray-600 mb-4">
              ابدأ بإنشاء حملتك التسويقية الأولى للوصول إلى عملائك
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إنشاء حملة جديدة
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketingCampaigns;
