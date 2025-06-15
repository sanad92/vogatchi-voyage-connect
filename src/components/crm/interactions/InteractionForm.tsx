
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface InteractionFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const InteractionForm = ({ onSubmit, onCancel }: InteractionFormProps) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    communication_type: 'phone',
    direction: 'outbound',
    content: '',
    duration_minutes: '',
    status: 'completed'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.content) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    onSubmit({
      ...formData,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>تسجيل تفاعل جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customer_id">العميل</Label>
            <Input
              id="customer_id"
              placeholder="ID العميل أو اسمه"
              value={formData.customer_id}
              onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>نوع التفاعل</Label>
              <Select 
                value={formData.communication_type}
                onValueChange={(value) => setFormData({...formData, communication_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">مكالمة هاتفية</SelectItem>
                  <SelectItem value="email">بريد إلكتروني</SelectItem>
                  <SelectItem value="whatsapp">واتساب</SelectItem>
                  <SelectItem value="meeting">اجتماع</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>الاتجاه</Label>
              <Select 
                value={formData.direction}
                onValueChange={(value) => setFormData({...formData, direction: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">صادر</SelectItem>
                  <SelectItem value="inbound">وارد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="content">محتوى التفاعل</Label>
            <Textarea
              id="content"
              placeholder="اكتب تفاصيل التفاعل..."
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">المدة (بالدقائق)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="15"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
              />
            </div>

            <div>
              <Label>الحالة</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">حفظ التفاعل</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default InteractionForm;
