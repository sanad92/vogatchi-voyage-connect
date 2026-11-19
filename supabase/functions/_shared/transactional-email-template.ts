const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const safeUrl = (v: unknown): string => {
  try { const u = new URL(String(v ?? "")); return u.protocol === "https:" ? esc(u.toString()) : "#"; } catch { return "#"; }
};
/** Every queued value is untrusted: escape strings, keep URLs https-only. */
function sanitizeTemplateData(raw: unknown): Record<string, any> {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k.endsWith("_url")) out[k] = safeUrl(v);
    else if (Array.isArray(v)) out[k] = v.slice(0, 100).map((i: any) => ({ description: esc(i?.description), amount: esc(i?.amount) }));
    else if (v != null && typeof v === "object") out[k] = "";
    else out[k] = esc(v).slice(0, 2000);
  }
  return out;
}
export const plainSubject = (v: unknown) => String(v ?? "").replace(/[\r\n]+/g, " ").slice(0, 200);

// Email templates
export function getEmailHtml(type: string, rawData: Record<string, any>): { subject: string; html: string } {
  const data = sanitizeTemplateData(rawData);
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
    © ${new Date().getFullYear()} Safar ERP — جميع الحقوق محفوظة
  </div>
</div>
</body></html>`;

  switch (type) {
    case "welcome":
      return {
        subject: `مرحباً بك في Safar ERP، ${data.name || ""}!`,
        html: wrapper("مرحباً بك! 🎉", `
          <p>أهلاً <strong>${data.name || "عزيزي العميل"}</strong>،</p>
          <p>يسعدنا انضمامك إلى <strong>Safar ERP</strong>. حسابك جاهز الآن للاستخدام.</p>
          <p>يمكنك البدء بإضافة عملائك وإنشاء حجوزاتك الأولى.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.login_url || '#'}" style="display:inline-block;background:${brandColor};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">ابدأ الآن</a>
          </div>
          <p>إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.</p>
        `),
      };

    case "customer_registered":
      return {
        subject: "مرحبًا بك",
        html: wrapper("مرحبًا بك", `
          <p>أهلًا ${data.customer_name || "بك"}، تم تسجيل بياناتك لدينا.</p>
          <p>شكرًا لاختيارك خدماتنا.</p>
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
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">المبلغ</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.amount ?? "-"}${data.amount != null && data.currency ? ` ${data.currency}` : ""}</td></tr>
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
        subject: plainSubject(rawData?.subject) || "إشعار من Safar ERP",
        html: wrapper("إشعار", `<p>${String(data.message || "").replace(/\n/g, "<br>")}</p>`),
      };
  }
}
