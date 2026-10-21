import * as XLSX from 'xlsx';

export const ROOM: Record<string, string> = { quad: 'رباعية', triple: 'ثلاثية', double: 'ثنائية', single: 'فردية' };
export const ROOM_SIZE: Record<string, number> = { quad: 4, triple: 3, double: 2, single: 1 };

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const money = (n: number, c = 'EGP') => `${Number(n || 0).toLocaleString('en-US')} ${c}`;

interface Org { name?: string | null; logo_url?: string | null }

/** Opens a printable, company-branded document in a new window. */
export function printDocument(org: Org | null, title: string, body: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  const logo = org?.logo_url ? `<img src="${esc(org.logo_url)}" style="height:56px"/>` : '';
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>body{font-family:'Noto Sans Arabic',Tahoma,sans-serif;color:#0D2342;padding:28px;font-size:13px}
header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #B59150;padding-bottom:12px;margin-bottom:18px}
h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 8px}table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #cfd6df;padding:6px 8px;text-align:start}th{background:#F8F5ED}.muted{color:#68788E}
.box{border:1px solid #cfd6df;padding:12px;border-radius:6px}.sign{display:flex;justify-content:space-between;margin-top:48px}
@media print{button{display:none}}</style></head><body>
<header><div><h1>${esc(org?.name)}</h1><div class="muted">${esc(title)}</div></div>${logo}</header>${body}
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

export function table(headers: string[], rows: unknown[][]) {
  return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

export const receiptHtml = (p: any, g: any, prog: any) => `
<div class="box"><p>رقم السند: <b>${esc(p.reference_number || p.id.slice(0, 8).toUpperCase())}</b> · التاريخ: ${esc(p.payment_date)}</p>
<p>استلمنا من السيد/ة: <b>${esc(g.full_name)}</b> مبلغ وقدره <b>${esc(money(p.amount, p.currency))}</b></p>
<p>وذلك عن: برنامج ${esc(prog.name)} (${prog.program_type === 'hajj' ? 'حج' : 'عمرة'}) · طريقة الدفع: ${esc(p.payment_method === 'cash' ? 'نقدي' : p.payment_method === 'bank_transfer' ? 'تحويل بنكي' : p.payment_method)}</p>
<p>إجمالي البرنامج: ${esc(money(g.total_price, prog.currency))} · إجمالي المدفوع: ${esc(money(g.paid_amount, prog.currency))} · المتبقي: <b>${esc(money(Math.max(0, g.total_price - g.paid_amount), prog.currency))}</b></p></div>
<div class="sign"><span>توقيع المستلم: ............</span><span>الختم</span></div>`;

export const contractHtml = (g: any, prog: any) => `
<h2>بيانات ${prog.program_type === 'hajj' ? 'الحاج' : 'المعتمر'}</h2>
${table(['الاسم', 'رقم الجواز', 'الرقم القومي', 'الهاتف', 'نوع الغرفة'], [[g.full_name, g.passport_number, g.national_id, g.phone, ROOM[g.room_type]]])}
<h2>تفاصيل البرنامج</h2>
${table(['البرنامج', 'السفر', 'العودة', 'مكة', 'المدينة', 'الطيران'], [[prog.name, prog.departure_date, prog.return_date, `${prog.makkah_hotel || '—'} (${prog.makkah_nights} ليالٍ)`, `${prog.madinah_hotel || '—'} (${prog.madinah_nights} ليالٍ)`, `${prog.airline || ''} ${prog.flight_details || ''}`]])}
<p>النقل: ${esc(prog.transport_details || '—')}</p>
<h2>القيمة المالية</h2><p>سعر البرنامج: <b>${esc(money(g.total_price, prog.currency))}</b> · المدفوع: ${esc(money(g.paid_amount, prog.currency))} · المتبقي: ${esc(money(Math.max(0, g.total_price - g.paid_amount), prog.currency))}</p>
<h2>الشروط والأحكام</h2><div class="box" style="white-space:pre-wrap">${esc(prog.terms || 'تخضع الرحلة لأنظمة وزارة السياحة ووزارة الحج والعمرة. يلتزم العميل بتسليم المستندات المطلوبة في المواعيد المحددة. تطبق سياسة الإلغاء المعلنة من الشركة.')}</div>
<div class="sign"><span>توقيع العميل: ............</span><span>عن الشركة: ............</span></div>`;

export const manifestRows = (list: any[]) =>
  list.map((g, i) => [i + 1, g.name_en || g.full_name, g.gender === 'female' ? 'F' : 'M', g.birth_date || '', g.nationality || '', g.passport_number || '', g.passport_expiry || '', g.visa_number || '']);
export const MANIFEST_HEADERS = ['#', 'Name', 'Sex', 'Birth date', 'Nationality', 'Passport', 'Expiry', 'Visa'];

export function exportExcel(fileName: string, sheets: { name: string; headers: string[]; rows: unknown[][] }[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s.headers, ...s.rows]), s.name.slice(0, 31)));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/** Room validation: mixed genders allowed only when every occupant shares a mahram/family group. */
export function roomIssues(occupants: any[], roomType: string) {
  const issues: string[] = [];
  if (occupants.length > (ROOM_SIZE[roomType] ?? 4)) issues.push('العدد أكبر من سعة الغرفة');
  const genders = new Set(occupants.map((o) => o.gender));
  if (genders.size > 1 && !occupants.every((o) => o.mahram_name || o.room_group)) issues.push('رجال ونساء بدون محرم/عائلة');
  return issues;
}
