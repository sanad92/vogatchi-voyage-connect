import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email templates
function getEmailHtml(type: string, data: Record<string, any>): { subject: string; html: string } {
  const brandColor = "#2563eb";
  const wrapper = (title: string, body: string) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:${brandColor};padding:32px 24px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;">${title}</h1>
  </div>
  <div style="padding:32px 24px;color:#1f2937;line-height:1.8;font-size:15px;">
    ${body}
  </div>
  <div style="padding:16px 24px;background:#f9fafb;text-align:center;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
    © ${new Date().getFullYear()} Vogatchi CRM — جميع الحقوق محفوظة
  </div>
</div>
</body></html>`;

  switch (type) {
    case "welcome":
      return {
        subject: `مرحباً بك في Vogatchi CRM، ${data.name || ""}!`,
        html: wrapper("مرحباً بك! 🎉", `
          <p>أهلاً <strong>${data.name || "عزيزي العميل"}</strong>،</p>
          <p>يسعدنا انضمامك إلى <strong>Vogatchi CRM</strong>. حسابك جاهز الآن للاستخدام.</p>
          <p>يمكنك البدء بإضافة عملائك وإنشاء حجوزاتك الأولى.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.login_url || '#'}" style="display:inline-block;background:${brandColor};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">ابدأ الآن</a>
          </div>
          <p>إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.</p>
        `),
      };

    case "booking_confirmation":
      return {
        subject: `تأكيد الحجز رقم ${data.booking_reference || ""}`,
        html: wrapper("تأكيد الحجز ✅", `
          <p>عزيزي <strong>${data.customer_name || "العميل"}</strong>،</p>
          <p>تم تأكيد حجزك بنجاح. إليك التفاصيل:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">رقم الحجز</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.booking_reference || "-"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">نوع الحجز</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.booking_type || "-"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">التاريخ</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.date || "-"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">المبلغ</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.amount || "-"} ج.م</td></tr>
            ${data.hotel_name ? `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">الفندق</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.hotel_name}</td></tr>` : ""}
            ${data.destination ? `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">الوجهة</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.destination}</td></tr>` : ""}
          </table>
          <p>شكراً لاختيارك لنا. نتمنى لك رحلة سعيدة!</p>
        `),
      };

    case "invoice":
      return {
        subject: `فاتورة رقم ${data.invoice_number || ""}`,
        html: wrapper("فاتورة 📄", `
          <p>عزيزي <strong>${data.customer_name || "العميل"}</strong>،</p>
          <p>مرفق أدناه تفاصيل الفاتورة:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">رقم الفاتورة</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.invoice_number || "-"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">المبلغ الإجمالي</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.total_amount || "-"} ج.م</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">تاريخ الاستحقاق</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.due_date || "-"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">الحالة</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.status || "معلق"}</td></tr>
          </table>
          ${data.items ? `<p><strong>البنود:</strong></p><ul>${(data.items as any[]).map((i: any) => `<li>${i.description} — ${i.amount} ج.م</li>`).join("")}</ul>` : ""}
          <p>يرجى السداد قبل تاريخ الاستحقاق. شكراً لتعاملكم معنا.</p>
        `),
      };

    case "subscription_activated":
      return {
        subject: "تم تفعيل اشتراكك بنجاح! 🎉",
        html: wrapper("اشتراك مفعّل ✅", `
          <p>مرحباً <strong>${data.org_name || ""}</strong>،</p>
          <p>تم تفعيل اشتراكك في خطة <strong>${data.plan_name || ""}</strong> بنجاح.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">الخطة</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.plan_name || "-"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">تاريخ الانتهاء</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.expires_at || "-"}</td></tr>
          </table>
          <p>استمتع بجميع الميزات المتاحة في خطتك!</p>
        `),
      };

    case "subscription_expiring":
      return {
        subject: "⚠️ اشتراكك على وشك الانتهاء",
        html: wrapper("تنبيه انتهاء الاشتراك ⚠️", `
          <p>مرحباً <strong>${data.org_name || ""}</strong>،</p>
          <p>اشتراكك في خطة <strong>${data.plan_name || ""}</strong> سينتهي بتاريخ <strong>${data.expires_at || ""}</strong>.</p>
          <p>لتجنب انقطاع الخدمة، يرجى تجديد اشتراكك قبل تاريخ الانتهاء.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.renew_url || '#'}" style="display:inline-block;background:${brandColor};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">تجديد الاشتراك</a>
          </div>
        `),
      };

    case "subscription_expired":
      return {
        subject: "❌ انتهى اشتراكك",
        html: wrapper("انتهاء الاشتراك ❌", `
          <p>مرحباً <strong>${data.org_name || ""}</strong>،</p>
          <p>للأسف، انتهى اشتراكك في خطة <strong>${data.plan_name || ""}</strong>.</p>
          <p>تم تقييد الوصول للنظام. يمكنك إعادة التفعيل في أي وقت من خلال اختيار خطة جديدة.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.pricing_url || '#'}" style="display:inline-block;background:${brandColor};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">عرض الخطط</a>
          </div>
        `),
      };

    default:
      return {
        subject: data.subject || "إشعار من Vogatchi CRM",
        html: wrapper("إشعار", `<p>${data.message || ""}</p>`),
      };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_id } = await req.json();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch email from queue
    const { data: email, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("id", email_id)
      .single();

    if (fetchError || !email) {
      throw new Error(`Email not found: ${fetchError?.message}`);
    }

    // Mark as processing
    await supabase
      .from("email_queue")
      .update({ status: "processing", attempts: email.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", email_id);

    // Generate email content
    const { subject, html } = getEmailHtml(email.email_type, email.template_data);

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Vogatchi CRM <noreply@vogatchi.com>",
        to: [email.recipient_email],
        subject: email.subject || subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(resendData.message || "Resend API error");
    }

    // Mark as sent
    await supabase
      .from("email_queue")
      .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", email_id);

    return new Response(JSON.stringify({ success: true, resend_id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send email error:", error);

    // Try to mark as failed
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { email_id } = await req.clone().json();
      if (email_id) {
        const { data: email } = await supabase.from("email_queue").select("attempts, max_attempts").eq("id", email_id).single();
        const newStatus = email && email.attempts >= email.max_attempts ? "failed" : "pending";
        await supabase
          .from("email_queue")
          .update({ status: newStatus, error_message: error.message, updated_at: new Date().toISOString() })
          .eq("id", email_id);
      }
    } catch (_) {}

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
