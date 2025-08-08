import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BlockType } from "@/types/blocks";

interface PageRow {
  id: string;
  name: string;
  slug: string;
}

interface BlockRow {
  id: string;
  page_id: string;
  type: BlockType;
  title: string | null;
  content: any;
  layout_settings: any;
  style_settings: any;
  is_active: boolean;
  order_index: number;
  section: string | null;
  created_at: string;
}

const BLOCK_TYPES: BlockType[] = [
  "hero",
  "services",
  "cities",
  "hotels",
  "contact",
  "direct_contracts",
  "custom_text",
  "image_gallery",
  "statistics",
];

const PageBlocks: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageRow | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    type: BlockType;
    title: string;
    section: string;
    is_active: boolean;
    order_index: number;
    content: string; // JSON string
  }>({
    type: "custom_text",
    title: "",
    section: "main",
    is_active: true,
    order_index: 0,
    content: JSON.stringify({ content: "نص مخصص" }, null, 2),
  });

  const loadData = async () => {
    if (!id) return;
    setLoading(true);

    const [{ data: pageData, error: pageErr }, { data: blocksData, error: blocksErr }] = await Promise.all([
      supabase.from("pages").select("id,name,slug").eq("id", id).maybeSingle<PageRow>(),
      supabase
        .from("blocks")
        .select("*")
        .eq("page_id", id)
        .order("order_index", { ascending: true })
        .returns<BlockRow[]>(),
    ]);

    if (pageErr) toast.error("فشل في جلب الصفحة");
    if (blocksErr) toast.error("فشل في جلب الأقسام");

    setPage(pageData || null);
    setBlocks(blocksData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    let parsed: any;
    try {
      parsed = form.content ? JSON.parse(form.content) : {};
    } catch (err) {
      toast.error("صيغة JSON غير صحيحة للمحتوى");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("blocks").insert({
      page_id: id,
      type: form.type,
      title: form.title || null,
      content: parsed,
      layout_settings: {},
      style_settings: {},
      is_active: form.is_active,
      order_index: form.order_index,
      section: form.section || null,
    });
    setSaving(false);

    if (error) return toast.error("تعذر إضافة القسم");
    toast.success("تمت إضافة القسم");
    setForm((f) => ({ ...f, title: "", content: JSON.stringify({}, null, 2) }));
    loadData();
  };

  const toggleActive = async (block: BlockRow) => {
    const { error } = await supabase
      .from("blocks")
      .update({ is_active: !block.is_active })
      .eq("id", block.id);
    if (error) return toast.error("فشل تحديث الحالة");
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, is_active: !b.is_active } : b)));
  };

  const removeBlock = async (blockId: string) => {
    const { error } = await supabase.from("blocks").delete().eq("id", blockId);
    if (error) return toast.error("تعذر حذف القسم");
    toast.success("تم حذف القسم");
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const moveBlock = async (block: BlockRow, direction: "up" | "down") => {
    const index = blocks.findIndex((b) => b.id === block.id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= blocks.length) return;

    const other = blocks[swapWith];

    const [res1, res2] = await Promise.all([
      supabase.from("blocks").update({ order_index: other.order_index }).eq("id", block.id),
      supabase.from("blocks").update({ order_index: block.order_index }).eq("id", other.id),
    ]);

    if (res1.error || res2.error) {
      return toast.error("تعذر تغيير الترتيب");
    }
    await loadData();
  };

  return (
    <div className="p-4">
      <button onClick={() => navigate(-1)} className="text-sm underline mb-2">عودة</button>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">أقسام الصفحة</h1>
        {page && (
          <p className="text-muted-foreground mt-1">
            الصفحة: {page.name} <span className="text-xs">/{page.slug}</span>
          </p>
        )}
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">إضافة قسم</h2>
        <form onSubmit={addBlock} className="grid gap-3 md:grid-cols-2">
          <select
            className="border rounded-md bg-card px-3 py-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as BlockType })}
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="border rounded-md bg-card px-3 py-2"
            placeholder="عنوان القسم (اختياري)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="border rounded-md bg-card px-3 py-2"
            placeholder="المكان/القسم (مثلاً main)"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
          />
          <input
            type="number"
            className="border rounded-md bg-card px-3 py-2"
            placeholder="ترتيب العرض"
            value={form.order_index}
            onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <span>فعّال</span>
          </label>
          <div className="md:col-span-2">
            <label className="text-sm mb-1 block">محتوى القسم (JSON)</label>
            <textarea
              className="border rounded-md bg-card px-3 py-2 w-full h-48 font-mono text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <button
            disabled={saving}
            className="border rounded-md px-4 py-2 bg-primary text-primary-foreground md:justify-self-start"
          >
            {saving ? "يتم الحفظ..." : "إضافة"}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify_between mb-3">
          <h2 className="text-lg font-semibold">الأقسام الحالية</h2>
          <button onClick={loadData} className="text-sm underline">
            تحديث
          </button>
        </div>
        {loading && <div className="text-muted-foreground">جاري التحميل...</div>}
        {!loading && blocks.length === 0 && (
          <div className="text-muted-foreground">لا توجد أقسام بعد</div>
        )}
        <div className="grid gap-3">
          {blocks.map((b, idx) => (
            <div key={b.id} className="rounded-lg border bg-card p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  #{b.order_index} — {b.type}
                  {b.title ? <span className="text-xs text-muted-foreground"> — {b.title}</span> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.is_active ? "فعّال" : "معطّل"} • {b.section || "main"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="border rounded-md px-3 py-1" onClick={() => moveBlock(b, "up")}>أعلى</button>
                <button className="border rounded-md px-3 py-1" onClick={() => moveBlock(b, "down")}>أسفل</button>
                <button className="border rounded-md px-3 py-1" onClick={() => toggleActive(b)}>
                  {b.is_active ? "تعطيل" : "تفعيل"}
                </button>
                <button className="border rounded-md px-3 py-1" onClick={() => removeBlock(b.id)}>
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PageBlocks;
