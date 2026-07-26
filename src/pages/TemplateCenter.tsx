import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, Eye, MessageSquare, FileText, Receipt, Ticket, Megaphone, Search, Plus, Trash2, Star, StarOff } from 'lucide-react';

type Channel = 'whatsapp' | 'email' | 'quote' | 'invoice' | 'voucher' | 'marketing' | 'internal';

interface UnifiedTemplate {
  id: string;
  source: 'whatsapp' | 'document';
  channel: Channel;
  name: string;
  category: string | null;
  body: string;
  variables: string[];
  is_default?: boolean;
  is_favorite?: boolean;
  language?: string | null;
  raw: any;
}

const CHANNEL_META: Record<Channel, { label: string; icon: any; color: string }> = {
  whatsapp:  { label: 'واتساب', icon: MessageSquare, color: 'text-emerald-600' },
  email:     { label: 'بريد إلكتروني', icon: FileText, color: 'text-sky-600' },
  quote:     { label: 'عرض سعر', icon: FileText, color: 'text-violet-600' },
  invoice:   { label: 'فاتورة', icon: Receipt, color: 'text-amber-600' },
  voucher:   { label: 'قسيمة', icon: Ticket, color: 'text-pink-600' },
  marketing: { label: 'تسويق', icon: Megaphone, color: 'text-orange-600' },
  internal:  { label: 'داخلي', icon: FileText, color: 'text-slate-600' },
};

function extractVars(body: string): string[] {
  const set = new Set<string>();
  const re = /\{\{\s*([\w.]+)\s*\}\}|\{(\d+)\}/g;
  let m;
  while ((m = re.exec(body))) set.add(m[1] ?? m[2]);
  return Array.from(set);
}

function mapDocKindToChannel(kind: string | null | undefined): Channel {
  const k = (kind || '').toLowerCase();
  if (k.includes('invoice')) return 'invoice';
  if (k.includes('quote')) return 'quote';
  if (k.includes('voucher')) return 'voucher';
  if (k.includes('email')) return 'email';
  if (k.includes('market')) return 'marketing';
  return 'internal';
}

const TemplateCenter = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Channel | 'all' | 'favorites'>('all');
  const [preview, setPreview] = useState<UnifiedTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const favKey = `template-favs:${orgId ?? 'anon'}`;
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(favKey) || '{}'); } catch { return {}; }
  });
  const toggleFav = (id: string) => {
    setFavs((f) => {
      const next = { ...f, [id]: !f[id] };
      localStorage.setItem(favKey, JSON.stringify(next));
      return next;
    });
  };

  const { data: whatsapp = [] } = useQuery({
    queryKey: ['tc-whatsapp', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('whatsapp_templates').select('*').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['tc-docs', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('document_templates').select('*').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const templates: UnifiedTemplate[] = useMemo(() => {
    const wa: UnifiedTemplate[] = (whatsapp as any[]).map((w) => {
      const body = w.body_text || w.body || w.content || '';
      return {
        id: `wa:${w.id}`,
        source: 'whatsapp',
        channel: 'whatsapp',
        name: w.name || 'بدون اسم',
        category: w.category || null,
        body,
        variables: extractVars(body),
        is_default: !!w.is_default,
        language: w.language,
        raw: w,
      };
    });
    const dc: UnifiedTemplate[] = (docs as any[]).map((d) => {
      const body = d.body || d.content || d.template_body || '';
      const channel = mapDocKindToChannel(d.type || d.kind || d.template_type);
      return {
        id: `doc:${d.id}`,
        source: 'document',
        channel,
        name: d.name || 'بدون اسم',
        category: d.category || d.type || null,
        body,
        variables: extractVars(body),
        is_default: !!d.is_default,
        raw: d,
      };
    });
    return [...wa, ...dc];
  }, [whatsapp, docs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (tab === 'favorites' && !favs[t.id]) return false;
      if (tab !== 'all' && tab !== 'favorites' && t.channel !== tab) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q)
      );
    });
  }, [templates, tab, search, favs]);

  const clone = useMutation({
    mutationFn: async (t: UnifiedTemplate) => {
      if (t.source === 'whatsapp') {
        const { id, created_at, updated_at, ...rest } = t.raw;
        const { error } = await (supabase as any).from('whatsapp_templates').insert({
          ...rest, name: `${t.name} (نسخة)`, organization_id: orgId,
        });
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...rest } = t.raw;
        const { error } = await (supabase as any).from('document_templates').insert({
          ...rest, name: `${t.name} (نسخة)`, organization_id: orgId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('تم النسخ'); qc.invalidateQueries({ queryKey: ['tc-whatsapp'] }); qc.invalidateQueries({ queryKey: ['tc-docs'] }); },
    onError: (e: any) => toast.error('فشل النسخ: ' + (e?.message || '')),
  });

  const remove = useMutation({
    mutationFn: async (t: UnifiedTemplate) => {
      const table = t.source === 'whatsapp' ? 'whatsapp_templates' : 'document_templates';
      const { error } = await (supabase as any).from(table).delete().eq('id', t.raw.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['tc-whatsapp'] }); qc.invalidateQueries({ queryKey: ['tc-docs'] }); },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || '')),
  });

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">مركز القوالب الموحد</h1>
          <p className="text-sm text-muted-foreground">قوالب واتساب، البريد، الفواتير، القسائم والتسويق في مكان واحد</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 ml-2" /> قالب جديد</Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pr-10" placeholder="ابحث في الاسم، الفئة أو المحتوى..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">الكل ({templates.length})</TabsTrigger>
          <TabsTrigger value="favorites"><Star className="w-3.5 h-3.5 ml-1" /> المفضلة</TabsTrigger>
          {(Object.keys(CHANNEL_META) as Channel[]).map((c) => (
            <TabsTrigger key={c} value={c}>{CHANNEL_META[c].label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => {
              const Meta = CHANNEL_META[t.channel];
              const Icon = Meta.icon;
              return (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${Meta.color}`} />
                        <CardTitle className="text-sm truncate">{t.name}</CardTitle>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => toggleFav(t.id)}>
                        {favs[t.id] ? <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline">{Meta.label}</Badge>
                      {t.category && <Badge variant="secondary">{t.category}</Badge>}
                      {t.is_default && <Badge>افتراضي</Badge>}
                      {t.language && <Badge variant="outline">{t.language}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.body || '—'}</p>
                    {t.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.variables.slice(0, 6).map((v) => <Badge key={v} variant="outline" className="text-[10px]">{`{{${v}}}`}</Badge>)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 pt-2">
                      <Button size="sm" variant="outline" onClick={() => setPreview(t)}><Eye className="w-3.5 h-3.5 ml-1" /> معاينة</Button>
                      <Button size="sm" variant="ghost" onClick={() => clone.mutate(t)} disabled={clone.isPending}><Copy className="w-3.5 h-3.5 ml-1" /> نسخ</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(t)} disabled={remove.isPending}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12 border rounded-lg">
                لا توجد قوالب مطابقة.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <PreviewDialog template={preview} onClose={() => setPreview(null)} />
      <CreateDialog open={creating} onClose={() => setCreating(false)} orgId={orgId} />
    </div>
  );
};

const PreviewDialog = ({ template, onClose }: { template: UnifiedTemplate | null; onClose: () => void }) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  const rendered = useMemo(() => {
    if (!template) return '';
    let out = template.body;
    for (const v of template.variables) {
      const val = vals[v] || `{{${v}}}`;
      out = out.split(`{{${v}}}`).join(val).split(`{{ ${v} }}`).join(val);
    }
    return out;
  }, [template, vals]);
  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader><DialogTitle>معاينة القالب — {template?.name}</DialogTitle></DialogHeader>
        {template && (
          <div className="space-y-3">
            {template.variables.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {template.variables.map((v) => (
                  <div key={v}>
                    <Label className="text-xs">{v}</Label>
                    <Input value={vals[v] || ''} onChange={(e) => setVals({ ...vals, [v]: e.target.value })} placeholder={v} />
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label className="text-xs mb-1">المعاينة</Label>
              <div className="border rounded-md p-3 bg-muted/40 whitespace-pre-wrap text-sm min-h-[120px]">{rendered}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CreateDialog = ({ open, onClose, orgId }: { open: boolean; onClose: () => void; orgId?: string }) => {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('لا توجد مؤسسة');
      if (channel === 'whatsapp') {
        const { error } = await (supabase as any).from('whatsapp_templates').insert({
          organization_id: orgId, name, category, body_text: body, language: 'ar',
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('document_templates').insert({
          organization_id: orgId, name, category, body, type: channel,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('تم الحفظ');
      qc.invalidateQueries({ queryKey: ['tc-whatsapp'] });
      qc.invalidateQueries({ queryKey: ['tc-docs'] });
      setName(''); setBody(''); setCategory('');
      onClose();
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || '')),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>قالب جديد</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>القناة</Label>
            <select className="w-full border rounded-md h-9 px-2 bg-background" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              {(Object.keys(CHANNEL_META) as Channel[]).map((c) => <option key={c} value={c}>{CHANNEL_META[c].label}</option>)}
            </select>
          </div>
          <div><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>الفئة</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Booking, Payments, Marketing..." /></div>
          <div><Label>المحتوى</Label><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="مرحبًا {{customer_name}} — حجزك {{booking_ref}}..." /></div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>حفظ</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateCenter;
