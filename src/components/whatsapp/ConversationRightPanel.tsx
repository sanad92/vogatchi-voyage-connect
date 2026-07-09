import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useConversationActions, useConversationHistory } from '@/hooks/useConversationActions';
import { useConversationTags, useConversationTagAssignments } from '@/hooks/useConversationTags';
import { useConversationNotes } from '@/hooks/useConversationNotes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Star, UserPlus, Tag as TagIcon, Trash2, Plus, X, MessageSquare, History as HistoryIcon,
  Info, StickyNote, Send, User, Sparkles, Bell, Briefcase,
} from 'lucide-react';
import { Customer360Panel } from './Customer360Panel';
import { WhatsAppCRMPanel } from './WhatsAppCRMPanel';
import { AIAssistantPanel } from './AIAssistantPanel';
import { FollowupsPanel } from './FollowupsPanel';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const STATUS_LABEL: Record<string, string> = {
  open: 'مفتوحة', pending: 'قيد الانتظار', active: 'نشطة',
  resolved: 'محلولة', closed: 'مغلقة', transferred: 'محوّلة', archived: 'مؤرشفة',
};
const PRIORITY_LABEL: Record<string, string> = {
  low: 'منخفض', normal: 'عادي', high: 'عالٍ', urgent: 'عاجل',
};
const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

interface Props {
  conversationId: string;
  conversation: any;
  onInsertText?: (text: string) => void;
}

export const ConversationRightPanel: React.FC<Props> = ({ conversationId, conversation, onInsertText }) => {
  const organizationId = useOrgId();
  const { assign, setStatus, setPriority, toggleStar } = useConversationActions(conversationId);
  const { tags, createTag } = useConversationTags();
  const { assignments, addTag, removeTag } = useConversationTagAssignments(conversationId);
  const { notes, addNote, deleteNote } = useConversationNotes(conversationId);
  const { data: history } = useConversationHistory(conversationId);

  const [noteDraft, setNoteDraft] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [tagDialogOpen, setTagDialogOpen] = useState(false);

  // Org members for assignment
  const { data: members } = useQuery({
    queryKey: ['org-members-list', organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', organizationId);
      if (error) throw error;
      const ids = (data || []).map((m: any) => m.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await (supabase as any)
        .from('profiles').select('id, full_name, email').in('id', ids);
      return (profiles || []).map((p: any) => ({
        ...p,
        role: (data || []).find((m: any) => m.user_id === p.id)?.role,
      }));
    },
    enabled: !!organizationId,
  });

  const assignedTagIds = assignments.map((a: any) => a.tag_id);
  const availableTags = tags.filter(t => !assignedTagIds.includes(t.id));

  const assignedMember = members?.find((m: any) => m.id === conversation.assigned_to);

  return (
    <div className="w-full h-full flex flex-col bg-card border-s">
      {/* Action bar */}
      <div className="border-b p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm" variant={conversation.is_starred ? 'default' : 'outline'}
            onClick={() => toggleStar.mutate(!conversation.is_starred)}
          >
            <Star className={`h-4 w-4 ${conversation.is_starred ? 'fill-current' : ''}`} />
          </Button>

          <Select value={conversation.status} onValueChange={(v) => setStatus.mutate(v as any)}>
            <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={conversation.priority} onValueChange={(v) => setPriority.mutate(v as any)}>
            <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="w-full justify-start">
              <UserPlus className="h-4 w-4 me-2" />
              {assignedMember ? `مُسند إلى: ${assignedMember.full_name || assignedMember.email}` : 'تخصيص محادثة'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 max-h-72 overflow-y-auto bg-popover z-50">
            <DropdownMenuLabel>اختر موظفًا</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {conversation.assigned_to && (
              <>
                <DropdownMenuItem onClick={() => assign.mutate({ userId: null })}>
                  <X className="h-4 w-4 me-2" /> إلغاء التخصيص
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {(members || []).map((m: any) => (
              <DropdownMenuItem key={m.id} onClick={() => assign.mutate({ userId: m.id })}>
                {m.full_name || m.email}
                {m.role && <Badge variant="outline" className="ms-auto text-[10px]">{m.role}</Badge>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <Badge className={PRIORITY_COLOR[conversation.priority] || ''}>
            {PRIORITY_LABEL[conversation.priority] || conversation.priority}
          </Badge>
          <Badge variant="outline">{STATUS_LABEL[conversation.status] || conversation.status}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ai" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-7 mx-3 mt-3">
          <TabsTrigger value="ai"><Sparkles className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="customer"><User className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="followups"><Bell className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="details"><Info className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="tags"><TagIcon className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="history"><HistoryIcon className="h-4 w-4" /></TabsTrigger>
        </TabsList>

        <TabsContent value="followups" className="flex-1 overflow-y-auto p-3 mt-0">
          <FollowupsPanel conversationId={conversationId} />
        </TabsContent>

        <TabsContent value="ai" className="flex-1 overflow-y-auto mt-0">
          <AIAssistantPanel
            conversationId={conversationId}
            conversation={conversation}
            onInsertText={onInsertText}
          />
        </TabsContent>

        <TabsContent value="customer" className="flex-1 overflow-y-auto mt-0">
          <Customer360Panel
            phone={conversation.phone_number}
            customerId={conversation.customer_id}
          />
        </TabsContent>

        <TabsContent value="details" className="flex-1 overflow-y-auto p-3 space-y-3 mt-0">
          <Card><CardContent className="p-3 space-y-2 text-sm">
            <div><span className="text-muted-foreground">الهاتف: </span>{conversation.phone_number}</div>
            {conversation.customer && (
              <div><span className="text-muted-foreground">العميل: </span>{conversation.customer.name}</div>
            )}
            {conversation.last_activity_at && (
              <div className="text-xs text-muted-foreground">
                آخر نشاط: {formatDistanceToNow(new Date(conversation.last_activity_at), { addSuffix: true, locale: ar })}
              </div>
            )}
            {conversation.first_response_at && (
              <div className="text-xs text-muted-foreground">
                أول رد: {formatDistanceToNow(new Date(conversation.first_response_at), { addSuffix: true, locale: ar })}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tags" className="flex-1 overflow-y-auto p-3 space-y-3 mt-0">
          <div className="flex flex-wrap gap-1.5">
            {assignments.map((a: any) => a.tag && (
              <Badge key={a.id} style={{ backgroundColor: a.tag.color, color: '#fff' }}
                className="cursor-pointer" onClick={() => removeTag.mutate(a.tag_id)}>
                {a.tag.name} <X className="h-3 w-3 ms-1" />
              </Badge>
            ))}
            {!assignments.length && <p className="text-xs text-muted-foreground">لا توجد وسوم مضافة</p>}
          </div>

          {availableTags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">أضف وسمًا:</p>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((t) => (
                  <Badge key={t.id} variant="outline" className="cursor-pointer"
                    style={{ borderColor: t.color, color: t.color }}
                    onClick={() => addTag.mutate(t.id)}>
                    <Plus className="h-3 w-3 me-1" /> {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full">
                <Plus className="h-4 w-4 me-1" /> وسم جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>إنشاء وسم جديد</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="اسم الوسم" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                <div className="flex items-center gap-2">
                  <label className="text-sm">اللون:</label>
                  <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)}
                    className="h-9 w-16 rounded border" />
                </div>
                <Button className="w-full" disabled={!newTagName.trim()}
                  onClick={async () => {
                    await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
                    setNewTagName(''); setTagDialogOpen(false);
                  }}>
                  إنشاء
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <div className="p-3 border-b">
            <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="اكتب ملاحظة داخلية (لن يراها العميل)"
              className="min-h-[70px] resize-none" />
            <Button size="sm" className="mt-2 w-full" disabled={!noteDraft.trim() || addNote.isPending}
              onClick={async () => { await addNote.mutateAsync({ content: noteDraft.trim() }); setNoteDraft(''); }}>
              <Send className="h-4 w-4 me-1" /> إضافة ملاحظة
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {notes.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">لا توجد ملاحظات</p>}
              {notes.map((n: any) => (
                <Card key={n.id} className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{n.author?.full_name || n.author?.email || 'موظف'}</span>
                      <div className="flex items-center gap-1">
                        <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={() => deleteNote.mutate(n.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{n.content}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto p-3 mt-0">
          <div className="space-y-2">
            {(!history || history.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-6">لا يوجد سجل بعد</p>
            )}
            {(history || []).map((h: any) => (
              <div key={h.id} className="text-xs border-r-2 border-primary/40 ps-3 py-1">
                <div className="font-medium">{h.action}</div>
                {h.reason && <div className="text-muted-foreground">{h.reason}</div>}
                <div className="text-muted-foreground">
                  {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: ar })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConversationRightPanel;
