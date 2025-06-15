
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Mail, Phone, Play, Pause, Eye } from 'lucide-react';

interface CampaignCardProps {
  campaign: any;
  customers: any[] | undefined;
}

const CampaignCard = ({ campaign, customers }: CampaignCardProps) => {
  const getCampaignStats = (campaign: any) => {
    const targetCustomers = campaign.target_segment_id ? 
      customers?.filter(c => c.segment_id === campaign.target_segment_id).length || 0 :
      customers?.length || 0;
    
    return {
      targetAudience: targetCustomers,
      sent: Math.floor(targetCustomers * 0.8),
      delivered: Math.floor(targetCustomers * 0.75),
      opened: Math.floor(targetCustomers * 0.45),
      responded: Math.floor(targetCustomers * 0.12)
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

  const stats = getCampaignStats(campaign);
  const deliveryRate = stats.targetAudience > 0 ? (stats.delivered / stats.targetAudience) * 100 : 0;
  const openRate = stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0;
  const responseRate = stats.sent > 0 ? (stats.responded / stats.sent) * 100 : 0;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
};

export default CampaignCard;
