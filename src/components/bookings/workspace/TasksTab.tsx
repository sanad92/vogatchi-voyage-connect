import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, ListChecks, StickyNote, Plus } from 'lucide-react';
import type { Workspace } from './types';
import type { BookingTask } from '@/hooks/useBookingWorkspace';

interface Props {
  workspace: Workspace;
}

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

  const open = workspace.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const done = workspace.tasks.filter((t) => t.status === 'done');

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> المهام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-3 space-y-2 bg-muted/20">
            <Input
              placeholder="عنوان المهمة"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="وصف اختياري"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={priority} onValueChange={(v) => setPriority(v as BookingTask['priority'])}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="normal">عادية</SelectItem>
                  <SelectItem value="high">مرتفعة</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-52 h-9"
              />
              <Button size="sm" onClick={submit} disabled={!title.trim() || saving}>
                <Plus className="h-4 w-4 ml-1" /> إضافة
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {open.length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد مهام مفتوحة.</p>
            )}
            {open.map((t) => (
              <TaskRow key={t.id} task={t} onComplete={() => workspace.completeTask(t.id)} />
            ))}
          </div>

          {done.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">مكتملة ({done.length})</p>
              {done.slice(0, 5).map((t) => (
                <TaskRow key={t.id} task={t} muted />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

const TaskRow = ({
  task,
  onComplete,
  muted,
}: {
  task: BookingTask;
  onComplete?: () => void;
  muted?: boolean;
}) => (
  <div
    className={`flex items-start justify-between gap-3 rounded-md border p-2 ${
      muted ? 'opacity-60' : ''
    }`}
  >
    <div className="flex-1">
      <p className={`text-sm font-medium ${muted ? 'line-through' : ''}`}>{task.title}</p>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
      )}
      {task.due_at && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(task.due_at).toLocaleString('ar-EG')}
        </p>
      )}
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-[10px]">
        {task.priority}
      </Badge>
      {onComplete && (
        <Button size="icon" variant="ghost" onClick={onComplete} title="إغلاق المهمة">
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
);
