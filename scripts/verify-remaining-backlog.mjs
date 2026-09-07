import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [migration,profit,travel,payment,salary,alerts,complaints,employees,app,navigation]=await Promise.all([
  read('supabase/migrations/20260907070000_close_remaining_backlog.sql'),read('src/hooks/useProfitAnalytics.ts'),
  read('src/pages/TravelKPIs.tsx'),read('src/pages/PaymentOrders.tsx'),read('src/hooks/useSalarySettings.tsx'),
  read('src/components/reports/SmartAlerts.tsx'),read('src/components/customers/ComplaintManagementSystem.tsx'),
  read('src/components/expenses/employee-management/DuplicateEmployeesManager.tsx'),read('src/App.tsx'),read('src/config/moduleNavigation.ts'),
]);

for(const fn of ['get_profit_analytics_dashboard','get_travel_kpi_dashboard','get_financial_exception_report','get_smart_operational_alerts','merge_employee_records','get_organization_salary_settings','update_organization_salary_setting']){
  assert.match(migration,new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}`),`${fn} must be migrated`);
  assert.match(migration,new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}`),`${fn} must revoke default execution`);
}
assert.match(migration,/ALTER TABLE public\.organization_salary_settings ENABLE ROW LEVEL SECURITY/,'salary settings require RLS');
assert.doesNotMatch(profit,/from\(['"](?:hotel_bookings|flight_bookings|car_rentals|transport_bookings)['"]\)/,'profit analytics cannot read legacy service tables');
assert.match(profit,/get_profit_analytics_dashboard/,'profit analytics must use its authoritative RPC');
assert.match(travel,/useTravelKpis/,'travel KPIs must use the authoritative hook');
assert.doesNotMatch(travel,/from\(['"]bookings['"]\)/,'travel KPI page cannot calculate from raw bookings');
assert.match(payment,/supplier_payment_orders/,'payment orders must use the real supplier order table');
assert.doesNotMatch(payment,/from\(['"]payment_orders['"]\)/,'removed payment_orders table must never be queried');
assert.match(salary,/get_organization_salary_settings/,'salary settings must use the organization-scoped read RPC');
assert.match(salary,/update_organization_salary_setting/,'salary settings must use the manager-protected update RPC');
assert.doesNotMatch(salary,/mockSettings|بيانات وهمية|محاكاة/,'salary settings cannot use mocks');
assert.match(alerts,/get_smart_operational_alerts/,'alerts must use live operational data');
assert.doesNotMatch(alerts,/mockAlerts/,'alerts cannot use mocks');
assert.match(complaints,/sop_incidents/,'complaints must use SOP incidents');
assert.match(employees,/merge_employee_records/,'employee merge must use a transactional RPC');
assert.match(app,/<Route path="\/payment-orders"/,'payment orders route must be enabled');
assert.match(app,/<Route path="\/financial-exceptions"/,'financial exceptions route must be enabled');
assert.match(navigation,/href: '\/financial-exceptions'/,'financial exception report must be discoverable');
console.log('Remaining backlog checks passed: 29/29');
