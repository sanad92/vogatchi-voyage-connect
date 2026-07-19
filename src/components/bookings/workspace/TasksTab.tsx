import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, ListChecks, StickyNote, Plus, AlertTriangle, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import type { Workspace } from './types';
import type { BookingTask } from '@/hooks/useBookingWorkspace';

interface Props {
  workspace: Workspace;
}

type Bucket = 'overdue' | 'today' | 'upcoming' | 'completed';

const priorityTone: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-amber-500 text-white',
  normal: 'bg-secondary text-secondary-foreground',
  low: 'bg-muted text-muted-foreground',
};

const bucketMeta: Record<Bucket, { label: string; icon: any; toneClass: string }> = {
  overdue: { label: 'متأخرة', icon: AlertTriangle, toneClass: 'text-destructive' },
  today: { label: 'اليوم', icon: Clock, toneClass: 'text-amber-600' },
  upcoming: { label: 'قادمة', icon: Calendar, toneClass: 'text-primary' },
  completed: { label: 'مكتملة', icon: CheckCircle2, toneClass: 'text-emerald-600' },
};

export const TasksTab = ({ workspace }: Props) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<BookingTask['priority']>('normal');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await workspace.addTask({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      setTitle('');
      setDescription('');
      setDueAt('');
      setPriority('normal');
    } finally {
      setSaving(false);
    }
  };

  const buckets = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86400000;
    const groups: Record<Bucket, BookingTask[]> = { overdue: [], today: [], upcoming: [], completed: [] };
    for (const t of workspace.tasks) {
      if (t.status === 'done') {
        groups.completed.push(t);
        continue;
      }
      if (t.status === 'cancelled') continue;
      const due = t.due_at ? new Date(t.due_at).getTime() : null;
      if (due !== null && due < startOfToday) groups.overdue.push(t);
      else if (due !== null && due < endOfToday) groups.today.push(t);
      else groups.upcoming.push(t);
    }
    groups.completed = groups.completed.slice(0, 10);
    return groups;
  }, [workspace.tasks]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" /> المهام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-md border p-3 space-y-2 bg-muted/20">
              <Input placeholder="عنوان المهمة" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="وصف اختياري" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={priority} onValueChange={(v) => setPriority(v as BookingTask['priority'])}>
                  <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="normal">عادية</SelectItem>
                    <SelectItem value="high">مرتفعة</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-52 h-9" />
                <Button size="sm" onClick={submit} disabled={!title.trim() || saving}>
                  <Plus className="h-4 w-4 ml-1" /> إضافة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {(['overdue', 'today', 'upcoming', 'completed'] as Bucket[]).map((b) => (
          <BucketSection
            key={b}
            bucket={b}
            tasks={buckets[b]}
            onComplete={(id) => workspace.completeTask(id)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4" /> ملاحظات العميل
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workspace.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد ملاحظات.</p>
          ) : (
            <div className="space-y-2">
              {workspace.notes.slice(0, 20).map((n: any) => (
                <div key={n.id} className="rounded-md border p-2 text-sm">
                  <p>{n.content || n.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString('ar-EG')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const BucketSection = ({
  bucket,
  tasks,
  onComplete,
}: {
  bucket: Bucket;
  tasks: BookingTask[];
  onComplete: (id: string) => void;
}) => {
  const meta = bucketMeta[bucket];
  const Icon = meta.icon;
  if (tasks.length === 0 && bucket !== 'today') return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${meta.toneClass}`} />
          {meta.label}
          <Badge variant="outline" className="text-[10px]">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا يوجد.</p>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className={`flex items-start justify-between gap-3 rounded-md border p-2 ${
                bucket === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex-1">
                <p className={`text-sm font-medium ${bucket === 'completed' ? 'line-through' : ''}`}>{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                {t.due_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(t.due_at).toLocaleString('ar-EG')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] ${priorityTone[t.priority] || priorityTone.normal}`}>{t.priority}</Badge>
                {bucket !== 'completed' && (
                  <Button size="icon" variant="ghost" onClick={() => onComplete(t.id)} title="إغلاق">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
