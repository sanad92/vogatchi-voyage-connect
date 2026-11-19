import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import type { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Zap, Plus } from 'lucide-react';
import CMSGuide from '@/components/cms/CMSGuide';
import { getExamplePage } from '@/utils/cmsExamples';

type PageRow = Pick<Tables<'pages'>, 'id' | 'slug' | 'title' | 'description' | 'is_published'>;

const CMSPages: React.FC = () => {
  const orgId = useOrgId();
  if (!orgId) return null;
  return <CompanyCMSPages key={orgId} orgId={orgId} />;
};

function CompanyCMSPages({ orgId }: { orgId: string }) {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const navigate = useNavigate();

  const addExamplePage = async (slug: string, pageName: string) => {
    const exampleBlocks = getExamplePage(slug);
    if (exampleBlocks.length === 0) {
      toast.error("لا توجد أمثلة متاحة لهذه الصفحة");
      return;
    }

    try {
      const { data: pageData, error: pageError } = await supabase
        .from("pages")
        .insert({
          organization_id: orgId,
          title: pageName,
          slug,
          description: `صفحة ${pageName} في SafarERP`,
          is_published: false,
        })
        .select("id")
        .single();

      if (pageError) throw pageError;

      const blocksToInsert = exampleBlocks.map(block => ({
        page_id: pageData.id,
        organization_id: orgId,
        type: block.type,
        title: block.title,
        content: block.content,
        is_active: block.is_active,
        order_index: block.order_index,
      }));

      const { error: blocksError } = await supabase
        .from("blocks")
        .insert(blocksToInsert);

      await loadPages();
      if (blocksError) return toast.error('تم حفظ مسودة الصفحة وتعذر إضافة الأقسام');
      toast.success(`تم حفظ مسودة ${pageName} وأقسامها`);
    } catch (error) {
      console.error('Error creating example page:', error);
      toast.error("فشل في إنشاء الصفحة");
    }
  };

  const loadPages = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pages")
      .select("id,slug,title,description,is_published")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("فشل في جلب الصفحات");
    } else {
      setPages(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPages();
  }, []);

  const createPage = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.name.trim();
    const slug = form.slug.trim();
    if (!title || !slug || creating) return;
    setCreating(true);
    const { error } = await supabase.from("pages").insert({
      organization_id: orgId,
      title,
      slug,
      description: form.description.trim() || null,
      is_published: false,
    });
    setCreating(false);
    if (error) return toast.error("تعذر حفظ مسودة الصفحة");
    toast.success("تم حفظ مسودة الصفحة");
    setForm({ name: "", slug: "", description: "" });
    await loadPages();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الصفحات</h1>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">نظام إدارة المحتوى</span>
        </div>
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        الصفحات محفوظة داخل الشركة. إتاحة رابط عام تتطلب ربط نطاق بالشركة وإعداد مسار النشر.
      </p>
      <Tabs defaultValue="pages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pages">الصفحات</TabsTrigger>
          <TabsTrigger value="examples">أمثلة سريعة</TabsTrigger>
          <TabsTrigger value="guide">دليل الاستعمال</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-6">
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">إنشاء مسودة صفحة</h2>
            <form onSubmit={createPage} className="grid gap-3 md:grid-cols-2">
              <input
                className="border rounded-md bg-card px-3 py-2"
                placeholder="الاسم"
                required
                aria-label="اسم الصفحة"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="border rounded-md bg-card px-3 py-2"
                placeholder="معرّف الصفحة"
                required
                aria-label="معرّف الصفحة"
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value })}
              />
              <input
                className="border rounded-md bg-card px-3 py-2 md:col-span-2"
                placeholder="وصف الصفحة (اختياري)"
                aria-label="وصف الصفحة"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
              <button disabled={creating} className="border rounded-md px-4 py-2 bg-primary text-primary-foreground md:justify-self-start">
                {creating ? "جارٍ الحفظ..." : "حفظ المسودة"}
              </button>
            </form>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">كل الصفحات</h2>
              <button onClick={loadPages} className="text-sm underline">تحديث</button>
            </div>
            <div className="grid gap-3">
              {loading && <div className="text-muted-foreground">جاري التحميل...</div>}
              {!loading && pages.length === 0 && <div className="text-muted-foreground">لا توجد صفحات بعد</div>}
              {pages.map((p) => (
                <div key={p.id} className="rounded-lg border bg-card p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.slug} · {p.is_published ? 'حالة نشر سابقة محفوظة' : 'مسودة'}</div>
                    {p.description && <div className="text-sm text-muted-foreground">{p.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/admin/cms/pages/${p.id}/blocks`)} className="border rounded-md px-3 py-1">الأقسام</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">أمثلة جاهزة للصفحات</h2>
            <p className="text-muted-foreground">احصل على صفحات كاملة بمحتوى تجريبي جاهز</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">صفحة تسجيل الدخول</h3>
              </div>
              <p className="text-sm text-muted-foreground">صفحة مخصصة لتسجيل دخول المستخدمين مع نموذج أنيق</p>
              <Button 
                onClick={() => addExamplePage('auth', 'تسجيل الدخول')}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                إنشاء صفحة تسجيل الدخول
              </Button>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">صفحة من نحن</h3>
              </div>
              <p className="text-sm text-muted-foreground">صفحة تعريفية بالشركة مع الرؤية والمهمة والقيم</p>
              <Button 
                onClick={() => addExamplePage('about', 'من نحن')}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                إنشاء صفحة من نحن
              </Button>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">صفحة تواصل معنا</h3>
              </div>
              <p className="text-sm text-muted-foreground">صفحة تحتوي على معلومات الاتصال والخدمات</p>
              <Button 
                onClick={() => addExamplePage('contact', 'تواصل معنا')}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                إنشاء صفحة تواصل معنا
              </Button>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">صفحة طلب حجز</h3>
              </div>
              <p className="text-sm text-muted-foreground">صفحة مع نموذج متكامل لطلب الحجوزات</p>
              <Button 
                onClick={() => addExamplePage('booking-request', 'طلب حجز')}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                إنشاء صفحة طلب حجز
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guide" className="space-y-6">
          <CMSGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CMSPages;