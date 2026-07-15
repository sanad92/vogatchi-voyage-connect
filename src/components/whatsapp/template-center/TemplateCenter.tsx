import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, RefreshCw, FileText, Pencil, Trash2, Eye } from 'lucide-react';
import { TEMPLATE_CATEGORIES, categoryMeta, type TemplateCategoryKey } from '@/data/travelTemplateCategories';
import { useWhatsAppTemplateCenter, type TemplateFilters } from '@/hooks/useWhatsAppTemplateCenter';
import { TemplateLibraryDialog } from './TemplateLibraryDialog';
import { TemplateEditorDialog } from './TemplateEditorDialog';
import { TemplateAnalyticsPanel } from './TemplateAnalyticsPanel';
import { TemplatePreview } from './TemplatePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusColors: Record<string, string> = {
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-400',
  draft: 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
};

export const TemplateCenter: React.FC = () => {
  const [filters, setFilters] = useState<TemplateFilters>({
    search: '',
    category: 'all',
    status: 'all',
    locale: 'all',
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState<any | null>(null);

  const { templates, isLoading, syncMeta, deleteTemplate } = useWhatsAppTemplateCenter(filters);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setEditorOpen(true);
  };

  const countByCategory = (key: TemplateCategoryKey) =>
    templates.filter((t: any) => t.category_key === key).length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            مركز قوالب السفر
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة، توليد، ومزامنة قوالب WhatsApp Business لوكالات السفر — مع مكتبة جاهزة وتحليلات مباشرة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => syncMeta.mutate()} disabled={syncMeta.isPending}>
            <RefreshCw className={`w-4 h-4 ml-1 ${syncMeta.isPending ? 'animate-spin' : ''}`} />
            مزامنة مع Meta
          </Button>
          <TemplateLibraryDialog />
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 ml-1" />
            قالب جديد
          </Button>
        </div>
      </div>

      <TemplateAnalyticsPanel />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="ابحث بالاسم أو المحتوى..."
                className="pr-8"
              />
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(v: any) => setFilters({ ...filters, status: v })}
            >
              <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="approved">معتمدة</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="rejected">مرفوضة</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.locale || 'all'}
              onValueChange={(v: any) => setFilters({ ...filters, locale: v })}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل اللغات</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilters({ ...filters, category: 'all' })}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filters.category === 'all' || !filters.category
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted'
              }`}
            >
              الكل ({templates.length})
            </button>
            {TEMPLATE_CATEGORIES.map((c) => {
              const active = filters.category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilters({ ...filters, category: c.key })}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-colors ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                  }`}
                >
                  <c.icon className="w-3 h-3" />
                  {c.labelAr} ({countByCategory(c.key)})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-1">لا توجد قوالب بعد</h3>
            <p className="text-sm text-muted-foreground mb-4">
              ابدأ باستيراد قوالب جاهزة من المكتبة أو أنشئ قالباً جديداً
            </p>
            <div className="flex items-center justify-center gap-2">
              <TemplateLibraryDialog />
              <Button onClick={openNew}>
                <Plus className="w-4 h-4 ml-1" /> قالب جديد
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t: any) => {
            const meta = categoryMeta(t.category_key);
            const status = (t.status || 'draft').toLowerCase();
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm truncate">{t.name}</h4>
                      {t.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                      )}
                    </div>
                    <Badge className={`${statusColors[status] || statusColors.draft} text-[10px]`}>
                      {status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {meta && (
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${meta.color}`}>
                        <meta.icon className="w-3 h-3" />
                        {meta.labelAr}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {(t.locale || t.language || 'ar').toUpperCase()}
                    </Badge>
                    {t.is_library_seed && (
                      <Badge variant="secondary" className="text-[10px]">مكتبة</Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap bg-muted/40 p-2 rounded">
                    {t.body_text}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>استخدم {t.usage_count || 0}×</span>
                    {t.meta_synced_at && (
                      <span>Meta: {new Date(t.meta_synced_at).toLocaleDateString('ar-EG')}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewing(t)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm('حذف هذا القالب؟')) deleteTemplate.mutate(t.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TemplateEditorDialog open={editorOpen} onOpenChange={setEditorOpen} initial={editing} />

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{previewing?.name}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <TemplatePreview
              header={previewing.header_text}
              body={previewing.body_text}
              footer={previewing.footer_text}
              locale={(previewing.locale || 'ar') as any}
              variables={(previewing.preview_variables || {}) as any}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
