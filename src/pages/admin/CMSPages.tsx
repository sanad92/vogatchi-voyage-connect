import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PageRow {
  id: string;
  slug: string;
  name: string;
  description?: string;
  is_active: boolean;
  seo_title?: string;
  seo_description?: string;
  created_at: string;
}

const CMSPages: React.FC = () => {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", is_active: true, seo_title: "", seo_description: "" });
  const navigate = useNavigate();

  const loadPages = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pages").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("فشل في جلب الصفحات");
    } else {
      setPages((data || []) as PageRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPages();
  }, []);

  const createPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) return toast.error("الاسم والـ slug مطلوبان");
    setCreating(true);
    const { error } = await supabase.from("pages").insert({
      name: form.name,
      slug: form.slug,
      is_active: form.is_active,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
    });
    setCreating(false);
    if (error) return toast.error("تعذر إنشاء الصفحة");
    toast.success("تم إنشاء الصفحة");
    setForm({ name: "", slug: "", is_active: true, seo_title: "", seo_description: "" });
    loadPages();
  };

  const toggleActive = async (id: string, next: boolean) => {
    const { error } = await supabase.from("pages").update({ is_active: next }).eq("id", id);
    if (error) return toast.error("تعذر التحديث");
    setPages(prev => prev.map(p => (p.id === id ? { ...p, is_active: next } : p)));
    toast.success("تم تحديث الحالة");
  };

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">إدارة الصفحات</h1>
        <p className="text-muted-foreground mt-1">إنشاء وتحرير الصفحات وربط الأقسام.</p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">إنشاء صفحة جديدة</h2>
        <form onSubmit={createPage} className="grid gap-3 md:grid-cols-2">
          <input
            className="border rounded-md bg-card px-3 py-2"
            placeholder="الاسم"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="border rounded-md bg-card px-3 py-2"
            placeholder="slug"
            value={form.slug}
            onChange={e => setForm({ ...form, slug: e.target.value })}
          />
          <input
            className="border rounded-md bg-card px-3 py-2 md:col-span-2"
            placeholder="عنوان SEO (اختياري)"
            value={form.seo_title}
            onChange={e => setForm({ ...form, seo_title: e.target.value })}
          />
          <input
            className="border rounded-md bg-card px-3 py-2 md:col-span-2"
            placeholder="وصف SEO (اختياري)"
            value={form.seo_description}
            onChange={e => setForm({ ...form, seo_description: e.target.value })}
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            <span>فعّالة</span>
          </label>
          <button disabled={creating} className="border rounded-md px-4 py-2 bg-primary text-primary-foreground md:justify-self-start">
            {creating ? "يتم الإنشاء..." : "إنشاء"}
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
                <div className="font-semibold">{p.name} <span className="text-xs text-muted-foreground">/{p.slug}</span></div>
                {p.seo_title && <div className="text-sm text-muted-foreground">{p.seo_title}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/admin/cms/pages/${p.id}/blocks`)} className="border rounded-md px-3 py-1">الأقسام</button>
                <button onClick={() => toggleActive(p.id, !p.is_active)} className="border rounded-md px-3 py-1">
                  {p.is_active ? "تعطيل" : "تفعيل"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CMSPages;
