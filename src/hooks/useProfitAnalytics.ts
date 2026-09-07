import { useQuery } from '@tanstack/react-query';
import { useOrgId } from './useOrgId';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export interface BookingProfit { id:string; bookingNumber:string; type:'hotel'|'flight'|'car_rental'|'transport'; typeName:string; customerName:string; customerId:string|null; employeeName:string|null; employeeId:string|null; sellingPrice:number; cost:number; additionalCosts:number; profit:number; profitMargin:number; date:string }
export interface CustomerProfit { customerId:string; customerName:string; totalBookings:number; totalRevenue:number; totalCost:number; totalProfit:number; profitMargin:number }
export interface EmployeeProfit { employeeId:string; employeeName:string; totalBookings:number; totalRevenue:number; totalCost:number; totalProfit:number; totalCommission:number; profitMargin:number }
export interface MonthlyProfit { month:number; monthName:string; revenue:number; cost:number; profit:number; bookingsCount:number }
export interface ProfitSummary { totalRevenue:number; totalCosts:number; netProfit:number; profitMargin:number; topEmployee:{name:string;profit:number}|null; topCustomer:{name:string;profit:number}|null }

interface GroupRow { id:string|null; name:string; booking_count:number; selling:number; total_cost:number; commissions?:number; net_contribution:number }
interface RpcResult {
  summary:{selling:number;supplier_cost:number;direct_expenses:number;commissions:number;net_contribution:number;margin_pct:number};
  monthly:Array<{month:string;booking_count:number;selling:number;total_cost:number;net_contribution:number}>;
  by_customer:GroupRow[]; by_employee:GroupRow[];
  bookings:Array<{id:string;booking_number:string;booking_type:BookingProfit['type'];start_date:string;customer_id:string|null;customer_name:string;employee_id:string|null;employee_name:string|null;selling:number;supplier_cost:number;additional_costs:number;net_contribution:number;margin_pct:number}>;
}
const typeNames:Record<string,string>={hotel:'فندق',flight:'طيران',car_rental:'تأجير سيارات',transport:'نقل'};

export const useProfitAnalytics=(startDate?:string,endDate?:string,currency='EGP')=>{
  const orgId=useOrgId();
  const query=useQuery({queryKey:['profit-analytics-authoritative',orgId,startDate,endDate,currency],enabled:Boolean(orgId&&startDate&&endDate),queryFn:async()=>{
    const {data,error}=await callUntypedRpc<RpcResult>('get_profit_analytics_dashboard',{_org_id:orgId,_start_date:startDate,_end_date:endDate,_currency:currency});
    if(error)throw error; return data;
  }});
  const raw=query.data;
  const bookings:BookingProfit[]=(raw?.bookings||[]).map(r=>({id:r.id,bookingNumber:r.booking_number,type:r.booking_type,typeName:typeNames[r.booking_type]||r.booking_type,customerName:r.customer_name,customerId:r.customer_id,employeeName:r.employee_name,employeeId:r.employee_id,sellingPrice:Number(r.selling||0),cost:Number(r.supplier_cost||0),additionalCosts:Number(r.additional_costs||0),profit:Number(r.net_contribution||0),profitMargin:Number(r.margin_pct||0),date:r.start_date}));
  const customerProfits:CustomerProfit[]=(raw?.by_customer||[]).map(r=>({customerId:r.id||'',customerName:r.name,totalBookings:Number(r.booking_count||0),totalRevenue:Number(r.selling||0),totalCost:Number(r.total_cost||0),totalProfit:Number(r.net_contribution||0),profitMargin:Number(r.selling||0)?Number(r.net_contribution||0)/Number(r.selling)*100:0}));
  const employeeProfits:EmployeeProfit[]=(raw?.by_employee||[]).map(r=>({employeeId:r.id||'',employeeName:r.name,totalBookings:Number(r.booking_count||0),totalRevenue:Number(r.selling||0),totalCost:Number(r.total_cost||0),totalProfit:Number(r.net_contribution||0),totalCommission:Number(r.commissions||0),profitMargin:Number(r.selling||0)?Number(r.net_contribution||0)/Number(r.selling)*100:0}));
  const monthlyProfits:MonthlyProfit[]=(raw?.monthly||[]).map(r=>{const d=new Date(`${r.month}T00:00:00`);return{month:d.getMonth()+1,monthName:d.toLocaleDateString('ar-EG',{month:'long',year:'numeric'}),revenue:Number(r.selling||0),cost:Number(r.total_cost||0),profit:Number(r.net_contribution||0),bookingsCount:Number(r.booking_count||0)}});
  const summary:ProfitSummary={totalRevenue:Number(raw?.summary.selling||0),totalCosts:Number((raw?.summary.supplier_cost||0)+(raw?.summary.direct_expenses||0)+(raw?.summary.commissions||0)),netProfit:Number(raw?.summary.net_contribution||0),profitMargin:Number(raw?.summary.margin_pct||0),topEmployee:employeeProfits[0]?{name:employeeProfits[0].employeeName,profit:employeeProfits[0].totalProfit}:null,topCustomer:customerProfits[0]?{name:customerProfits[0].customerName,profit:customerProfits[0].totalProfit}:null};
  return{bookings,summary,customerProfits,employeeProfits,monthlyProfits,isLoading:query.isLoading,error:query.error,refetch:query.refetch};
};
