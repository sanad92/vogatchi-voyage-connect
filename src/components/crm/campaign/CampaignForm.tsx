
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CampaignFormProps {
  newCampaign: any;
  setNewCampaign: (campaign: any) => void;
  customerSegments: any[] | undefined;
  onSubmit: () => void;
  onCancel: () => void;
}

const CampaignForm = ({ 
  newCampaign, 
  setNewCampaign, 
  customerSegments, 
  onSubmit, 
  onCancel 
}: CampaignFormProps) => {
  return (
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
        <Button onClick={onSubmit} className="flex-1">
          إنشاء الحملة
        </Button>
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </div>
  );
};

export default CampaignForm;
