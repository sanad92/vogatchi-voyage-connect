import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Info, UserMinus } from 'lucide-react';
import { useTeamManagement, TeamMember } from '@/hooks/useTeamManagement';

interface Props {
  member: TeamMember | null;
  onClose: () => void;
}

const OffboardMemberDialog = ({ member, onClose }: Props) => {
  const { offboardMember } = useTeamManagement();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const submit = async () => {
    if (!member) return;
    const res = await offboardMember.mutateAsync({
      userId: member.user_id,
      terminationDate: date,
      note: note.trim() || undefined,
    });
    if (res?.success) {
      setNote('');
      onClose();
    }
  };

  return (
    <Dialog open={!!member} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-destructive" />
            إنهاء خدمة موظف
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg border bg-muted/40 text-sm">
            <p className="font-medium">{member?.full_name || 'بدون اسم'}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{member?.email}</p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg border bg-primary/5 border-primary/20">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              سيتم إيقاف عضوية الموظف وتحرير مقعد الاشتراك فوراً، وإنهاء سجله في الموارد البشرية.
              لن يتم حذف أي حجوزات أو فواتير أو قيود محاسبية — كل السجلات التاريخية تبقى كما هي.
            </p>
          </div>

          <div>
            <Label>تاريخ إنهاء الخدمة</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <Label>ملاحظة (اختياري)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="سبب إنهاء الخدمة أو تعليمات التسليم"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-between pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={offboardMember.isPending}>
            إلغاء
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={submit}
            disabled={offboardMember.isPending}
          >
            {offboardMember.isPending ? 'جاري التنفيذ...' : 'إنهاء الخدمة وتحرير المقعد'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OffboardMemberDialog;
