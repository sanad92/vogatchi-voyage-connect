/** A B2B installment plan is a prospective payment schedule.
 * It is never a posted invoice, receipt or customer GL balance.
 */
export type B2BInstallment = { due_date:string; amount:number };

const toMinor = (amount:number) => Math.round(amount*100);
export function validateB2BInstallments(rows:B2BInstallment[], total:number):string[] {
  const issues:string[]=[];
  if(!Number.isFinite(total)||total<=0||Math.abs(total*100-toMinor(total))>1e-6)
    issues.push('إجمالي البيع غير صالح');
  if(rows.length<1||rows.length>12)issues.push('عدد الدفعات يجب أن يكون بين 1 و12');
  let sum=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.due_date))
      issues.push('تاريخ الدفعة '+(i+1)+' غير صالح');
    if(!Number.isFinite(r.amount)||r.amount<=0||
       Math.abs(r.amount*100-toMinor(r.amount))>1e-6)
      issues.push('مبلغ الدفعة '+(i+1)+' غير صالح');
    else sum+=toMinor(r.amount);
  }
  if(sum!==toMinor(total))issues.push('مجموع الدفعات لا يساوي قيمة العرض');
  return issues;
}
