// deno-lint-ignore-file
// AI Assistant chat endpoint. Non-streaming, tool-calling loop.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/ai-gateway.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const ALLOWED_ROLES = new Set(["owner", "admin", "manager"]);
const MAX_STEPS = 6;

interface ChatMsg {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

const tools = [
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "ملخص مالي للمؤسسة خلال فترة: إجمالي المبيعات، تكلفة الموردين، الربح، المدفوعات المستلمة، المدفوعات للموردين، المصروفات، الذمم المدينة والدائنة.",
      parameters: {
        type: "object",
        properties: {
          from_date: { type: "string", description: "YYYY-MM-DD (اختياري، افتراضي: بداية الشهر الحالي)" },
          to_date: { type: "string", description: "YYYY-MM-DD (اختياري، افتراضي: اليوم)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_bookings",
      description: "بحث في الحجوزات. يعيد أحدث 20 حجزًا مطابقًا مع المبلغ والحالة والعميل.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string" },
          status: { type: "string" },
          from_date: { type: "string" },
          to_date: { type: "string" },
          limit: { type: "number", description: "افتراضي 20، الحد الأقصى 50" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_summary",
      description: "بيانات عميل: الاسم، البريد، رصيد الحجوزات، إجمالي المدفوع، والذمم المستحقة.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "جزء من اسم أو بريد العميل" },
          customer_id: { type: "string", description: "UUID للعميل (أدق)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_overdue_invoices",
      description: "قائمة الفواتير غير المسددة أو المتأخرة عن السداد.",
      parameters: {
        type: "object",
        properties: {
          days_overdue: { type: "number", description: "الحد الأدنى لعدد أيام التأخر (افتراضي 0)" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_supplier_dues",
      description: "المستحقات على الموردين (فواتير أو دفعات معلقة).",
      parameters: {
        type: "object",
        properties: {
          supplier_name: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_customers",
      description: "أعلى العملاء من حيث إجمالي المبيعات خلال فترة.",
      parameters: {
        type: "object",
        properties: {
          from_date: { type: "string" },
          to_date: { type: "string" },
          limit: { type: "number", description: "افتراضي 10" },
        },
      },
    },
  },
];

function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date(); d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

async function runTool(name: string, args: any, ctx: { supabase: any; orgId: string }) {
  const { supabase, orgId } = ctx;
  const from = args?.from_date || firstOfMonth();
  const to = args?.to_date || today();

  try {
    if (name === "get_financial_summary") {
      const [bk, pay, sup, exp, inv] = await Promise.all([
        supabase.from("bookings").select("id, total_amount, cost_amount, status, booking_date")
          .eq("organization_id", orgId).gte("booking_date", from).lte("booking_date", to),
        supabase.from("payment_transactions").select("amount, status, created_at")
          .eq("organization_id", orgId).eq("status", "completed").gte("created_at", from).lte("created_at", to + "T23:59:59"),
        supabase.from("supplier_payments").select("amount, status, payment_date")
          .eq("organization_id", orgId).gte("payment_date", from).lte("payment_date", to),
        supabase.from("expense_transactions").select("amount, expense_date")
          .eq("organization_id", orgId).gte("expense_date", from).lte("expense_date", to),
        supabase.from("invoices").select("total_amount, paid_amount, status")
          .eq("organization_id", orgId),
      ]);
      const sum = (arr: any[], k: string) => (arr || []).reduce((a, b) => a + Number(b[k] || 0), 0);
      const sales = sum(bk.data || [], "total_amount");
      const cost = sum(bk.data || [], "cost_amount");
      const collected = sum(pay.data || [], "amount");
      const paidToSuppliers = sum(sup.data || [], "amount");
      const expenses = sum(exp.data || [], "amount");
      const ar = (inv.data || []).reduce((a: number, b: any) =>
        a + Math.max(0, Number(b.total_amount || 0) - Number(b.paid_amount || 0)), 0);
      return {
        period: { from, to },
        sales, supplier_cost: cost, gross_profit: sales - cost,
        collected_from_customers: collected,
        paid_to_suppliers: paidToSuppliers,
        expenses,
        net_cash_flow: collected - paidToSuppliers - expenses,
        outstanding_receivables: ar,
        bookings_count: (bk.data || []).length,
      };
    }

    if (name === "search_bookings") {
      let q = supabase.from("bookings")
        .select("id, booking_reference, total_amount, cost_amount, status, booking_date, customer_id, customers(name, email)")
        .eq("organization_id", orgId)
        .order("booking_date", { ascending: false })
        .limit(Math.min(Number(args?.limit || 20), 50));
      if (args?.status) q = q.eq("status", args.status);
      if (args?.from_date) q = q.gte("booking_date", args.from_date);
      if (args?.to_date) q = q.lte("booking_date", args.to_date);
      const { data, error } = await q;
      if (error) return { error: error.message };
      let rows = data || [];
      if (args?.customer_name) {
        const n = String(args.customer_name).toLowerCase();
        rows = rows.filter((r: any) => (r.customers?.name || "").toLowerCase().includes(n));
      }
      return { count: rows.length, bookings: rows };
    }

    if (name === "get_customer_summary") {
      let cust: any = null;
      if (args?.customer_id) {
        const { data } = await supabase.from("customers").select("*").eq("organization_id", orgId).eq("id", args.customer_id).maybeSingle();
        cust = data;
      } else if (args?.customer_name) {
        const { data } = await supabase.from("customers").select("*").eq("organization_id", orgId)
          .or(`name.ilike.%${args.customer_name}%,email.ilike.%${args.customer_name}%`).limit(1).maybeSingle();
        cust = data;
      }
      if (!cust) return { error: "لم يتم العثور على العميل" };
      const [bk, inv] = await Promise.all([
        supabase.from("bookings").select("total_amount, cost_amount, status")
          .eq("organization_id", orgId).eq("customer_id", cust.id),
        supabase.from("invoices").select("total_amount, paid_amount, status")
          .eq("organization_id", orgId).eq("customer_id", cust.id),
      ]);
      const sales = (bk.data || []).reduce((a: number, b: any) => a + Number(b.total_amount || 0), 0);
      const paid = (inv.data || []).reduce((a: number, b: any) => a + Number(b.paid_amount || 0), 0);
      const outstanding = (inv.data || []).reduce((a: number, b: any) =>
        a + Math.max(0, Number(b.total_amount || 0) - Number(b.paid_amount || 0)), 0);
      return {
        customer: { id: cust.id, name: cust.name, email: cust.email, phone: cust.phone },
        bookings_count: (bk.data || []).length,
        total_sales: sales, total_paid: paid, outstanding_balance: outstanding,
      };
    }

    if (name === "get_overdue_invoices") {
      const { data, error } = await supabase.from("invoices")
        .select("id, invoice_number, total_amount, paid_amount, due_date, status, customer_id, customers(name)")
        .eq("organization_id", orgId).neq("status", "paid")
        .order("due_date", { ascending: true }).limit(Math.min(Number(args?.limit || 20), 50));
      if (error) return { error: error.message };
      const minDays = Number(args?.days_overdue || 0);
      const now = Date.now();
      const rows = (data || []).filter((r: any) => {
        const d = r.due_date ? new Date(r.due_date).getTime() : null;
        if (!d) return false;
        return (now - d) / 86400000 >= minDays;
      }).map((r: any) => ({
        ...r,
        outstanding: Math.max(0, Number(r.total_amount || 0) - Number(r.paid_amount || 0)),
        days_overdue: Math.floor((now - new Date(r.due_date).getTime()) / 86400000),
      }));
      return { count: rows.length, invoices: rows };
    }

    if (name === "get_supplier_dues") {
      let q = supabase.from("supplier_payments")
        .select("id, amount, status, payment_date, supplier_id, suppliers(name)")
        .eq("organization_id", orgId).neq("status", "paid")
        .order("payment_date", { ascending: true })
        .limit(Math.min(Number(args?.limit || 20), 50));
      const { data, error } = await q;
      if (error) return { error: error.message };
      let rows = data || [];
      if (args?.supplier_name) {
        const n = String(args.supplier_name).toLowerCase();
        rows = rows.filter((r: any) => (r.suppliers?.name || "").toLowerCase().includes(n));
      }
      const total = rows.reduce((a, b: any) => a + Number(b.amount || 0), 0);
      return { count: rows.length, total_due: total, payments: rows };
    }

    if (name === "get_top_customers") {
      const { data, error } = await supabase.from("bookings")
        .select("total_amount, customer_id, customers(name, email)")
        .eq("organization_id", orgId).gte("booking_date", from).lte("booking_date", to);
      if (error) return { error: error.message };
      const map = new Map<string, { name: string; email: string; sales: number; count: number }>();
      for (const r of data || []) {
        const id = r.customer_id;
        if (!id) continue;
        const prev = map.get(id) || { name: r.customers?.name || "?", email: r.customers?.email || "", sales: 0, count: 0 };
        prev.sales += Number(r.total_amount || 0); prev.count += 1;
        map.set(id, prev);
      }
      const rows = Array.from(map.entries())
        .map(([id, v]) => ({ customer_id: id, ...v }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, Math.min(Number(args?.limit || 10), 50));
      return { period: { from, to }, top_customers: rows };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const jwt = authHeader.slice(7);

    // Authenticated client (RLS as user) for all data reads
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    const { data: claims } = await supabase.auth.getClaims(jwt);
    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { thread_id, organization_id, user_message, context } = body;
    if (!thread_id || !organization_id || !user_message) {
      return new Response(JSON.stringify({ error: "thread_id, organization_id, user_message مطلوبة" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Role gate
    const { data: mem } = await supabase.from("organization_members")
      .select("role, is_active").eq("organization_id", organization_id).eq("user_id", userId).maybeSingle();
    if (!mem?.is_active || !ALLOWED_ROLES.has(mem.role)) {
      return new Response(JSON.stringify({ error: "غير مصرح — المساعد متاح للإدارة فقط" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load recent history (last 20 messages) via RLS
    const { data: history } = await supabase.from("ai_assistant_messages")
      .select("role, content, tool_calls, tool_call_id, tool_name")
      .eq("thread_id", thread_id).order("created_at", { ascending: true }).limit(40);

    // Save user message
    await supabase.from("ai_assistant_messages").insert({
      thread_id, role: "user", content: user_message,
    });

    const systemPrompt = `أنت "Vogatchi AI" — مساعد مالي/تشغيلي ذكي لوكالة سفر راقية.
مهمتك: تحليل بيانات المنصة (حجوزات، فواتير، مدفوعات، ذمم، ربحية، KPIs) وتقديم إجابات دقيقة ومختصرة بالعربية بأسلوب كونسيرج محترف.

قواعد صارمة:
- استخدم الأدوات المتاحة لجلب البيانات الحقيقية قبل الإجابة على أي سؤال يتعلق بأرقام أو حالة النظام. لا تخترع أرقامًا أبدًا.
- لا تكشف عن SQL أو أسماء جداول داخلية.
- ردودك بالعربية، مركزة، بتنسيق Markdown (نقاط، جداول عند الحاجة).
- عند غياب البيانات، قل ذلك صراحة واقترح الخطوة التالية.
- التاريخ اليوم: ${today()}.
- المؤسسة: ${organization_id}. سياق المستخدم الحالي: ${context ? JSON.stringify(context) : "غير محدد"}.`;

    const messages: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => {
        if (m.role === "tool") return { role: "tool", content: m.content || "", tool_call_id: m.tool_call_id, name: m.tool_name };
        if (m.role === "assistant" && m.tool_calls) return { role: "assistant", content: m.content, tool_calls: m.tool_calls };
        return { role: m.role, content: m.content };
      }),
      { role: "user", content: user_message },
    ];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    let finalAssistant: { content: string; tool_calls?: any } | null = null;

    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "custom-fetch",
        },
        body: JSON.stringify({ model: DEFAULT_MODEL, messages, tools, tool_choice: "auto", temperature: 0.3 }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 429) throw new Error("تم تجاوز حد الطلبات. حاول لاحقاً.");
        if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي منتهي. يرجى إضافة رصيد.");
        throw new Error(`AI Gateway ${res.status}: ${text}`);
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error("رد فارغ من نموذج الذكاء الاصطناعي");

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });
        // Persist assistant tool-call turn
        await supabase.from("ai_assistant_messages").insert({
          thread_id, role: "assistant", content: msg.content || null, tool_calls: msg.tool_calls,
        });

        for (const call of msg.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(call.function.arguments || "{}"); } catch {}
          const result = await runTool(call.function.name, args, { supabase, orgId: organization_id });
          const resultStr = JSON.stringify(result);
          messages.push({ role: "tool", content: resultStr, tool_call_id: call.id, name: call.function.name });
          await supabase.from("ai_assistant_messages").insert({
            thread_id, role: "tool", content: resultStr, tool_call_id: call.id, tool_name: call.function.name,
          });
        }
        continue;
      }

      finalAssistant = { content: msg.content || "" };
      break;
    }

    if (!finalAssistant) {
      finalAssistant = { content: "تعذّر إكمال الرد. حاول إعادة الصياغة." };
    }

    await supabase.from("ai_assistant_messages").insert({
      thread_id, role: "assistant", content: finalAssistant.content,
    });
    await supabase.from("ai_assistant_threads").update({ updated_at: new Date().toISOString() }).eq("id", thread_id);

    return new Response(JSON.stringify({ success: true, message: finalAssistant.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
