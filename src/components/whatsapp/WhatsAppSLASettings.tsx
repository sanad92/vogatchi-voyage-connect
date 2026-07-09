import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Clock, Save } from 'lucide-react';
import { useWhatsAppSLASettings } from '@/hooks/useWhatsAppSLASettings';
import {
  BusinessHours, DAY_LABELS, DAY_KEYS, DEFAULT_BUSINESS_HOURS,
} from '@/lib/businessHours';

const TIMEZONES = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain',
  'Africa/Cairo', 'Africa/Casablanca', 'Asia/Baghdad', 'Asia/Amman', 'Europe/Istanbul', 'UTC',
];

export const WhatsAppSLASettings: React.FC = () => {
  const { settings, isLoading, save, isSaving } = useWhatsAppSLASettings();
  const [tz, setTz] = useState('Asia/Riyadh');
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [firstResp, setFirstResp] = useState(15);
  const [resolution, setResolution] = useState(1440);
  const [autoReply, setAutoReply] = useState(false);
  const [oohMessage, setOohMessage] = useState('');

  useEffect(() => {
    if (!settings) return;
    setTz(settings.timezone || 'Asia/Riyadh');
    setHours(settings.business_hours || DEFAULT_BUSINESS_HOURS);
    setFirstResp(settings.sla_first_response_minutes || 15);
    setResolution(settings.sla_resolution_minutes || 1440);
    setAutoReply(!!settings.auto_reply_enabled);
    setOohMessage(settings.out_of_hours_message || '');
  }, [settings]);

  const handleSave = () => {
    save({
      timezone: tz,
      business_hours: hours,
      sla_first_response_minutes: firstResp,
      sla_resolution_minutes: resolution,
      auto_reply_enabled: autoReply,
      out_of_hours_message: oohMessage || null,
    });
  };

  const updateDay = (day: keyof BusinessHours, patch: Partial<BusinessHours[keyof BusinessHours]>) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            SLA وأوقات الاستجابة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>وقت الاستجابة الأولى (دقائق)</Label>
              <Input
                type="number" min={1}
                value={firstResp}
                onChange={(e) => setFirstResp(parseInt(e.target.value) || 15)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                إذا لم يرد الفريق خلال هذه المدة، تُوسم المحادثة كخرق SLA
              </p>
            </div>
            <div>
              <Label>وقت الحل النهائي (دقائق)</Label>
              <Input
                type="number" min={1}
                value={resolution}
                onChange={(e) => setResolution(parseInt(e.target.value) || 1440)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                1440 = 24 ساعة. المحادثات التي لا تُحل قبل هذه المدة تعتبر متجاوزة
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أوقات العمل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>المنطقة الزمنية</Label>
            <Select value={tz} onValueChange={setTz}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {DAY_KEYS.map((day) => (
              <div key={day} className="flex items-center gap-3 p-2 border rounded-md">
                <Switch
                  checked={hours[day]?.enabled}
                  onCheckedChange={(v) => updateDay(day, { enabled: v })}
                />
                <span className="w-20 text-sm">{DAY_LABELS[day]}</span>
                <Input
                  type="time"
                  className="w-32"
                  value={hours[day]?.open || '09:00'}
                  disabled={!hours[day]?.enabled}
                  onChange={(e) => updateDay(day, { open: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  type="time"
                  className="w-32"
                  value={hours[day]?.close || '18:00'}
                  disabled={!hours[day]?.enabled}
                  onChange={(e) => updateDay(day, { close: e.target.value })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الرد التلقائي خارج الدوام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
            <Label>تفعيل الرد التلقائي خارج أوقات العمل</Label>
          </div>
          <Textarea
            value={oohMessage}
            onChange={(e) => setOohMessage(e.target.value)}
            placeholder="شكراً لتواصلك مع Vogatchi. فريقنا خارج ساعات العمل حالياً وسنعود إليك في أقرب وقت."
            className="min-h-[100px]"
            disabled={!autoReply}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 me-2" />
          {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
};
