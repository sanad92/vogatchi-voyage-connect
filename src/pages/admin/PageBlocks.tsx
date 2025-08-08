import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactJson from "react-json-view";
import { toast } from "sonner";

interface PageRow { id: string; name: string; slug: string; }
interface BlockRow {
  id: string;
  page_id: string;
  type: string;
  title?: string;
  content: any;
  layout_settings: any;
  style_settings: any;
  is_active: boolean;
  order_index: number;
  section?: string;
}

const typeOptions = ["hero","services","image_gallery","statistics","custom_text"];

const PageBlocks: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageRow | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBlock, setNewBlock] = useState({ title: "", type: "hero", is_active: true });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: p, error: pe } = await supabase.from("pages").select("id,name,slug").eq("id", id).maybeSingle();
    if (pe) toast.error("تعذر جلب الصفحة");
    setPage(p as PageRow);
    const { data: bs, error: be } = await supabase.from("blocks").select("*").eq("page_id", id).order("order_index", { ascending: true });
    if (be) toast.error("تعذر جلب الأقسام");
    setBlocks((bs || []) as BlockRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const addBlock = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("blocks").insert({
      page_id: id,
      type: newBlock.type,
      title: newBlock.title || null,
      is_active: newBlock.is_active,
      order_index: blocks.length,
      content: {},
      layout_settings: {},
      style_settings: {}
    });
    setSaving(false);
    if (error) return toast.error("تعذر إضافة القسم");
    toast.success("تمت الإضافة");
    setNewBlock({ title: "", type: "hero", is_active: true });
    load();
  };

  const saveBlock = async (b: BlockRow) => {
    setSaving(true);
    const { error } = await supabase.from("blocks").update({
      title: b.title || null,
      type: b.type,
      is_active: b.is_active,
      order_index: b.order_index,
      content: b.content || {},
      layout_settings: b.layout_settings || {},
      style_settings: b.style_settings || {}
    }).eq("id", b.id);
    setSaving(false);
    if (error) return toast.error("تعذر الحفظ");
    toast.success("تم الحفظ");
    load();
  };

  const deleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("blocks").delete().eq("id", blockId);
    if (error) return toast.error("تعذر الحذف");
    toast.success("تم الحذف");
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const a = blocks[index];
    const b = blocks[target];
    // swap order_index
    const { error: e1 } = await supabase.from("blocks").update({ order_index: b.order_index }).eq("id", a.id);
    const { error: e2 } = await supabase.from("blocks").update({ order_index: a.order_index }).eq("id", b.id);
    if (e1 || e2) return toast.error("تعذر إعادة الترتيب");
    load();
  };

  const setBlockState = (id: string, updater: (b: BlockRow) => BlockRow) => {
    setBlocks(prev => prev.map(b => (b.id === id ? updater({ ...b }) : b)));
  };

  if (loading) return <div className="p-4 text-muted-foreground">جاري التحميل...</div>;
  if (!page) return <div className="p-4 text-muted-foreground">لم يتم العثور على الصفحة</div>;

  return (
    <div className="p-4">
      <button onClick={() => navigate(-1)} className="text-sm underline mb-2">عودة</button>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">بلوكات الصفحة: {page.name} <span className="text-sm text-muted-foreground">/{page.slug}</span></h1>
      </header>

      <section className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="font-semibold mb-3">إضافة قسم جديد</h2>
        <div className="grid gap-3 md:grid-cols-3 items-end">
          <input className="border rounded-md bg-card px-3 py-2" placeholder="العنوان (اختياري)" value={newBlock.title}
            onChange={e => setNewBlock({ ...newBlock, title: e.target.value })} />
          <select className="border rounded-md bg-card px-3 py-2" value={newBlock.type}
            onChange={e => setNewBlock({ ...newBlock, type: e.target.value })}>
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={newBlock.is_active}
                onChange={e => setNewBlock({ ...newBlock, is_active: e.target.checked })} />
              <span>فعّال</span>
            </label>
            <button disabled={saving} onClick={addBlock} className="border rounded-md px-4 py-2 bg-primary text-primary-foreground">
              {saving ? "..." : "إضافة"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {blocks.map((b, idx) => (
          <article key={b.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-semibold">{b.title || `قسم ${idx+1}`} <span className="text-xs text-muted-foreground">({b.type})</span></div>
                <div className="text-xs text-muted-foreground">الترتيب: {b.order_index}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => move(idx, -1)} className="border rounded-md px-3 py-1">أعلى</button>
                <button onClick={() => move(idx, 1)} className="border rounded-md px-3 py-1">أسفل</button>
                <button onClick={() => setExpanded(prev => ({ ...prev, [b.id]: !prev[b.id] }))} className="border rounded-md px-3 py-1">{expanded[b.id] ? "إخفاء" : "تعديل"}</button>
                <button onClick={() => deleteBlock(b.id)} className="border rounded-md px-3 py-1">حذف</button>
              </div>
            </div>

            {expanded[b.id] && (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <input className="border rounded-md bg-card px-3 py-2" placeholder="العنوان" value={b.title || ""}
                    onChange={e => setBlockState(b.id, bb => ({ ...bb, title: e.target.value }))} />
                  <select className="border rounded-md bg-card px-3 py-2" value={b.type}
                    onChange={e => setBlockState(b.id, bb => ({ ...bb, type: e.target.value }))}>
                    {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input className="border rounded-md bg-card px-3 py-2" type="number" value={b.order_index}
                    onChange={e => setBlockState(b.id, bb => ({ ...bb, order_index: parseInt(e.target.value || '0', 10) }))} />
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={b.is_active}
                      onChange={e => setBlockState(b.id, bb => ({ ...bb, is_active: e.target.checked }))} />
                    <span>فعّال</span>
                  </label>
                </div>

                <div>
                  <h3 className="font-medium mb-2">المحتوى</h3>
                  <ReactJson
                    name={false}
                    src={b.content || {}}
                    onEdit={(e) => setBlockState(b.id, bb => ({ ...bb, content: e.updated_src }))}
                    onAdd={(e) => setBlockState(b.id, bb => ({ ...bb, content: e.updated_src }))}
                    onDelete={(e) => setBlockState(b.id, bb => ({ ...bb, content: e.updated_src }))}
                    enableClipboard={false}
                    displayDataTypes={false}
                    collapsed={2}
                    theme="harmonic"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">إعدادات التخطيط</h3>
                    <ReactJson
                      name={false}
                      src={b.layout_settings || {}}
                      onEdit={(e) => setBlockState(b.id, bb => ({ ...bb, layout_settings: e.updated_src }))}
                      onAdd={(e) => setBlockState(b.id, bb => ({ ...bb, layout_settings: e.updated_src }))}
                      onDelete={(e) => setBlockState(b.id, bb => ({ ...bb, layout_settings: e.updated_src }))}
                      enableClipboard={false}
                      displayDataTypes={false}
                      collapsed={2}
                      theme="harmonic"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">إعدادات المظهر</h3>
                    <ReactJson
                      name={false}
                      src={b.style_settings || {}}
                      onEdit={(e) => setBlockState(b.id, bb => ({ ...bb, style_settings: e.updated_src }))}
                      onAdd={(e) => setBlockState(b.id, bb => ({ ...bb, style_settings: e.updated_src }))}
                      onDelete={(e) => setBlockState(b.id, bb => ({ ...bb, style_settings: e.updated_src }))}
                      enableClipboard={false}
                      displayDataTypes={false}
                      collapsed={2}
                      theme="harmonic"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button disabled={saving} onClick={() => saveBlock(b)} className="border rounded-md px-4 py-2 bg-primary text-primary-foreground">حفظ</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
};

export default PageBlocks;
