
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Phone, Users } from 'lucide-react';
import type { MarketingCampaign } from '@/types/crm';
import type { Customer } from '@/types/customer';

interface CampaignCardProps {
  campaign: MarketingCampaign;
  customers: Customer[] | undefined;
}

const CampaignCard = ({ campaign, customers }: CampaignCardProps) => {
  const targetAudience = campaign.target_segment_id ?
      customers?.filter(c => c.segment_id === campaign.target_segment_id).length || 0 :
      customers?.length || 0;

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
          <div className="flex items-center justify-between text-sm rounded-md bg-muted/50 p-3">
            <span className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /> الجمهور المستهدف</span>
            <span className="font-medium">{targetAudience} عميل</span>
          </div>
          <p className="text-xs text-muted-foreground">
            هذه مسودة فقط. الإرسال الفعلي ونتائج التسليم ستُربط عند مراجعة موديول WhatsApp والأتمتة.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignCard;
