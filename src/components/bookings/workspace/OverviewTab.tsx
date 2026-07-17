import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Building2, TrendingUp, TrendingDown, ListChecks, MessageCircle } from 'lucide-react';
import type { Workspace, TabKey } from './types';

interface Props {
  workspace: Workspace;
  onOpenTab: (t: TabKey) => void;
}

export const OverviewTab = ({ workspace, onOpenTab }: Props) => {
  const f = workspace.financials;
  const nextTask = workspace.tasks.find((t) => t.status !== 'done' && t.status !== 'cancelled');
  const openTasks = workspace.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
  const margin = f.selling > 0 ? (f.profit / f.selling) * 100 : 0;
  const positive = f.profit >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> بطاقة العميل
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Row label="الاسم" value={workspace.customer?.name || '—'} />
          <Row
            label="الهاتف"
            value={workspace.customer?.phone || '—'}
            icon={<Phone className="h-3 w-3" />}
          />
          <Row
            label="البريد"
            value={workspace.customer?.email || '—'}
            icon={<Mail className="h-3 w-3" />}
          />
          <Row
            label="المورد"
            value={workspace.supplier?.name || workspace.booking?.supplier_name || '—'}
            icon={<Building2 className="h-3 w-3" />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {positive ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            ملخص الربح
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="سعر البيع" value={`${f.selling.toLocaleString()} ${f.currency}`} />
          <Row label="التكلفة" value={`${f.cost.toLocaleString()} ${f.currency}`} />
          <Row
            label="الربح"
            value={
              <span className={positive ? 'text-emerald-600 font-semibold' : 'text-destructive font-semibold'}>
                {f.profit.toLocaleString()} {f.currency}
              </span>
            }
          />
          <Row label="الهامش" value={`${margin.toFixed(1)}%`} />
          <Row label="المستحق" value={`${f.outstanding.toLocaleString()} ${f.currency}`} />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> المهام
            {openTasks > 0 && <Badge variant="secondary" className="mr-1">{openTasks}</Badge>}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenTab('tasks')}>
            عرض الكل
          </Button>
        </CardHeader>
        <CardContent className="text-sm">
          {nextTask ? (
            <div className="rounded-md border p-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{nextTask.title}</p>
                {nextTask.description && (
                  <p className="text-xs text-muted-foreground mt-1">{nextTask.description}</p>
                )}
                {nextTask.due_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    مستحقة: {new Date(nextTask.due_at).toLocaleString('ar-EG')}
                  </p>
                )}
              </div>
              <Badge variant="outline">{nextTask.priority}</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">لا توجد مهام مفتوحة.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" /> واتساب
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenTab('whatsapp')}>
            فتح
          </Button>
        </CardHeader>
        <CardContent className="text-sm">
          {workspace.conversation ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">آخر نشاط</p>
              <p className="font-medium">
                {workspace.conversation.last_message_at
                  ? new Date(workspace.conversation.last_message_at).toLocaleString('ar-EG')
                  : '—'}
              </p>
              {workspace.conversation.unread_count ? (
                <Badge className="mt-1">{workspace.conversation.unread_count} غير مقروءة</Badge>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">لا توجد محادثة مرتبطة بعد.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Row = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground text-xs flex items-center gap-1">
      {icon}
      {label}
    </span>
    <span className="font-medium truncate">{value}</span>
  </div>
);
