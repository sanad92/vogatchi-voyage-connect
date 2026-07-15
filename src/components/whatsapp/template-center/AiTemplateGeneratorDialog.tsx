import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { TEMPLATE_CATEGORIES, type TemplateCategoryKey } from '@/data/travelTemplateCategories';
import { useWhatsAppTemplateCenter } from '@/hooks/useWhatsAppTemplateCenter';

interface Props {
  category: TemplateCategoryKey;
  locale: 'ar' | 'en';
  onGenerated: (t: any) => void;
}

export const AiTemplateGeneratorDialog: React.FC<Props> = ({ category, locale, onGenerated }) => {
  const { generateWithAI } = useWhatsAppTemplateCenter();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'urgent'>('professional');
  const [cat, setCat] = useState<TemplateCategoryKey>(category);
  const [loc, setLoc] = useState<'ar' | 'en'>(locale);

  const submit = async () => {
    if (!brief.trim()) return;
    const result = await generateWithAI.mutateAsync({ brief, category: cat, tone, locale: loc });
    if (result) {
      onGenerated(result);
      setOpen(false);
      setBrief('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="w-4 h-4" />
          توليد بالذكاء
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            مولد القوالب بالذكاء الاصطناعي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>ماذا تريد أن يقول القالب؟</Label>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              placeholder="مثال: إشعار العميل بأن رحلته إلى دبي مؤكدة، مع تذكير بموعد تسجيل الدخول..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>الفئة</Label>
              <Select value={cat} onValueChange={(v: any) => setCat(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.labelAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>النبرة</Label>
              <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">مهنية</SelectItem>
                  <SelectItem value="friendly">ودودة</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>اللغة</Label>
              <Select value={loc} onValueChange={(v: any) => setLoc(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={generateWithAI.isPending || !brief.trim()}>
            {generateWithAI.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin ml-1" /> جاري التوليد...</>
            ) : (
              <><Sparkles className="w-4 h-4 ml-1" /> توليد</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
