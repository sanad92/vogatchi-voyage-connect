
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from './useOrgId';

export interface BookingProfit {
  id: string;
  type: 'hotel' | 'flight' | 'car_rental' | 'transport';
  typeName: string;
  customerName: string;
  customerId: string | null;
  employeeName: string | null;
  employeeId: string | null;
  sellingPrice: number;
  cost: number;
  additionalCosts: number;
  profit: number;
  profitMargin: number;
  date: string;
}

export interface CustomerProfit {
  customerId: string;
  customerName: string;
  totalBookings: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

export interface EmployeeProfit {
  employeeId: string;
  employeeName: string;
  totalBookings: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalCommission: number;
  profitMargin: number;
}

export interface MonthlyProfit {
  month: number;
  monthName: string;
  revenue: number;
  cost: number;
  profit: number;
  bookingsCount: number;
}

export interface ProfitSummary {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  topEmployee: { name: string; profit: number } | null;
  topCustomer: { name: string; profit: number } | null;
}

const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export const useProfitAnalytics = (startDate?: string, endDate?: string) => {
  const orgId = useOrgId();

  const bookingProfitsQuery = useQuery({
    queryKey: ['profit-analytics-bookings', orgId, startDate, endDate],
    queryFn: async (): Promise<BookingProfit[]> => {
      const results: BookingProfit[] = [];

      // Hotel bookings
      let hq = supabase.from('hotel_bookings').select('id, customer_name, customer_id, total_cost_customer, total_profit, booking_date, employees(full_name, id)') as any;
      if (startDate) hq = hq.gte('booking_date', startDate);
      if (endDate) hq = hq.lte('booking_date', endDate);
      const { data: hotels } = await hq;

      (hotels || []).forEach((b: any) => {
        const selling = b.total_cost_customer || 0;
        const profit = b.total_profit || 0;
        const cost = selling - profit;
        results.push({
          id: b.id, type: 'hotel', typeName: 'فندق',
          customerName: b.customer_name || 'غير محدد',
          customerId: b.customer_id,
          employeeName: b.employees?.full_name || null,
          employeeId: b.employees?.id || null,
          sellingPrice: selling, cost, additionalCosts: 0, profit,
          profitMargin: selling > 0 ? (profit / selling) * 100 : 0,
          date: b.booking_date || '',
        });
      });

      // Flight bookings
      let fq = supabase.from('flight_bookings').select('id, customer_name, customer_id, total_cost_egp, supplier_cost_egp, total_profit, booking_date, employees(full_name, id)') as any;
      if (startDate) fq = fq.gte('booking_date', startDate);
      if (endDate) fq = fq.lte('booking_date', endDate);
      const { data: flights } = await fq;

      (flights || []).forEach((b: any) => {
        const selling = b.total_cost_egp || 0;
        const cost = b.supplier_cost_egp || 0;
        const profit = b.total_profit || (selling - cost);
        results.push({
          id: b.id, type: 'flight', typeName: 'طيران',
          customerName: b.customer_name || 'غير محدد',
          customerId: b.customer_id,
          employeeName: b.employees?.full_name || null,
          employeeId: b.employees?.id || null,
          sellingPrice: selling, cost, additionalCosts: 0, profit,
          profitMargin: selling > 0 ? (profit / selling) * 100 : 0,
          date: b.booking_date || '',
        });
      });

      // Car rentals
      let cq = supabase.from('car_rentals').select('id, customer_name, customer_id, total_cost_egp, total_rental_cost, supplier_cost_egp, supplier_total_cost, total_profit, rental_start_date, employees(full_name, id)') as any;
      if (startDate) cq = cq.gte('rental_start_date', startDate);
      if (endDate) cq = cq.lte('rental_start_date', endDate);
      const { data: cars } = await cq;

      (cars || []).forEach((b: any) => {
        const selling = b.total_cost_egp || b.total_rental_cost || 0;
        const cost = b.supplier_cost_egp || b.supplier_total_cost || 0;
        const profit = b.total_profit || (selling - cost);
        results.push({
          id: b.id, type: 'car_rental', typeName: 'تأجير سيارات',
          customerName: b.customer_name || 'غير محدد',
          customerId: b.customer_id,
          employeeName: b.employees?.full_name || null,
          employeeId: b.employees?.id || null,
          sellingPrice: selling, cost, additionalCosts: 0, profit,
          profitMargin: selling > 0 ? (profit / selling) * 100 : 0,
          date: b.rental_start_date || '',
        });
      });

      // Transport bookings
      let tq = supabase.from('transport_bookings').select('id, customer_name, customer_id, total_cost, supplier_cost, total_profit, booking_date, employees(full_name, id)') as any;
      if (startDate) tq = tq.gte('booking_date', startDate);
      if (endDate) tq = tq.lte('booking_date', endDate);
      const { data: transports } = await tq;

      (transports || []).forEach((b: any) => {
        const selling = b.total_cost || 0;
        const cost = b.supplier_cost || 0;
        const profit = b.total_profit || (selling - cost);
        results.push({
          id: b.id, type: 'transport', typeName: 'نقل',
          customerName: b.customer_name || 'غير محدد',
          customerId: b.customer_id,
          employeeName: b.employees?.full_name || null,
          employeeId: b.employees?.id || null,
          sellingPrice: selling, cost, additionalCosts: 0, profit,
          profitMargin: selling > 0 ? (profit / selling) * 100 : 0,
          date: b.booking_date || '',
        });
      });

      return results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!orgId,
    staleTime: 3 * 60 * 1000,
  });

  const commissionsQuery = useQuery({
    queryKey: ['profit-analytics-commissions', orgId, startDate, endDate],
    queryFn: async () => {
      let q = supabase.from('employee_commissions').select('employee_id, commission_amount, booking_id, employees(full_name)') as any;
      if (startDate) q = q.gte('commission_date', startDate);
      if (endDate) q = q.lte('commission_date', endDate);
      const { data } = await q;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 3 * 60 * 1000,
  });

  const bookings = bookingProfitsQuery.data || [];
  const commissions = commissionsQuery.data || [];

  // Summary
  const summary: ProfitSummary = (() => {
    const totalRevenue = bookings.reduce((s, b) => s + b.sellingPrice, 0);
    const totalCosts = bookings.reduce((s, b) => s + b.cost, 0);
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Top employee
    const empMap = new Map<string, { name: string; profit: number }>();
    bookings.forEach(b => {
      if (b.employeeId && b.employeeName) {
        const e = empMap.get(b.employeeId) || { name: b.employeeName, profit: 0 };
        e.profit += b.profit;
        empMap.set(b.employeeId, e);
      }
    });
    const topEmployee = [...empMap.values()].sort((a, b) => b.profit - a.profit)[0] || null;

    // Top customer
    const custMap = new Map<string, { name: string; profit: number }>();
    bookings.forEach(b => {
      const key = b.customerId || b.customerName;
      const c = custMap.get(key) || { name: b.customerName, profit: 0 };
      c.profit += b.profit;
      custMap.set(key, c);
    });
    const topCustomer = [...custMap.values()].sort((a, b) => b.profit - a.profit)[0] || null;

    return { totalRevenue, totalCosts, netProfit, profitMargin, topEmployee, topCustomer };
  })();

  // Customer profits
  const customerProfits: CustomerProfit[] = (() => {
    const map = new Map<string, CustomerProfit>();
    bookings.forEach(b => {
      const key = b.customerId || b.customerName;
      const c = map.get(key) || {
        customerId: b.customerId || '', customerName: b.customerName,
        totalBookings: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, profitMargin: 0,
      };
      c.totalBookings++;
      c.totalRevenue += b.sellingPrice;
      c.totalCost += b.cost;
      c.totalProfit += b.profit;
      c.profitMargin = c.totalRevenue > 0 ? (c.totalProfit / c.totalRevenue) * 100 : 0;
      map.set(key, c);
    });
    return [...map.values()].sort((a, b) => b.totalProfit - a.totalProfit);
  })();

  // Employee profits
  const employeeProfits: EmployeeProfit[] = (() => {
    const map = new Map<string, EmployeeProfit>();
    bookings.forEach(b => {
      if (!b.employeeId) return;
      const e = map.get(b.employeeId) || {
        employeeId: b.employeeId, employeeName: b.employeeName || '',
        totalBookings: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, totalCommission: 0, profitMargin: 0,
      };
      e.totalBookings++;
      e.totalRevenue += b.sellingPrice;
      e.totalCost += b.cost;
      e.totalProfit += b.profit;
      e.profitMargin = e.totalRevenue > 0 ? (e.totalProfit / e.totalRevenue) * 100 : 0;
      map.set(b.employeeId, e);
    });
    // Add commissions
    commissions.forEach((c: any) => {
      if (c.employee_id && map.has(c.employee_id)) {
        map.get(c.employee_id)!.totalCommission += (c.commission_amount || 0);
      }
    });
    return [...map.values()].sort((a, b) => b.totalProfit - a.totalProfit);
  })();

  // Monthly profits
  const monthlyProfits: MonthlyProfit[] = (() => {
    const map = new Map<number, MonthlyProfit>();
    for (let i = 0; i < 12; i++) {
      map.set(i, { month: i + 1, monthName: MONTH_NAMES[i], revenue: 0, cost: 0, profit: 0, bookingsCount: 0 });
    }
    bookings.forEach(b => {
      if (!b.date) return;
      const m = new Date(b.date).getMonth();
      const entry = map.get(m)!;
      entry.revenue += b.sellingPrice;
      entry.cost += b.cost;
      entry.profit += b.profit;
      entry.bookingsCount++;
    });
    return [...map.values()];
  })();

  return {
    bookings,
    summary,
    customerProfits,
    employeeProfits,
    monthlyProfits,
    isLoading: bookingProfitsQuery.isLoading || commissionsQuery.isLoading,
    error: bookingProfitsQuery.error || commissionsQuery.error,
  };
};
