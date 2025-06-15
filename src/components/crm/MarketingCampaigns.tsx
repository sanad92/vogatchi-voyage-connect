
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Send } from 'lucide-react';
import { useCRM } from '@/hooks/useCRM';
import { useCustomers } from '@/hooks/useCustomers';
import { toast } from 'sonner';
import CampaignStats from './campaign/CampaignStats';
import CampaignForm from './campaign/CampaignForm';
import CampaignCard from './campaign/CampaignCard';

const MarketingCampaigns = () => {
  const { customerSegments, marketingCampaigns, createCampaign } = useCRM();
  const { customers } = useCustomers();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
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

  return (
    <div className="space-y-6">
      <CampaignStats marketingCampaigns={marketingCampaigns} />

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
            
            <CampaignForm
              newCampaign={newCampaign}
              setNewCampaign={setNewCampaign}
              customerSegments={customerSegments}
              onSubmit={handleCreateCampaign}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {marketingCampaigns?.map((campaign) => (
          <CampaignCard 
            key={campaign.id} 
            campaign={campaign} 
            customers={customers}
          />
        ))}
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
