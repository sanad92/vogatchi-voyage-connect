
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, TrendingUp } from 'lucide-react';
import { useProfitAnalytics } from '@/hooks/useProfitAnalytics';
import ProfitSummaryCards from '@/components/profits/ProfitSummaryCards';
import ProfitOverviewTab from '@/components/profits/ProfitOverviewTab';
import BookingProfitsTab from '@/components/profits/BookingProfitsTab';
import CustomerProfitsTab from '@/components/profits/CustomerProfitsTab';
import EmployeeProfitsTab from '@/components/profits/EmployeeProfitsTab';

const ProfitAnalytics = () => {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { bookings, summary, customerProfits, employeeProfits, monthlyProfits, isLoading } = useProfitAnalytics(startDate, endDate);

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">تحليل الأرباح</h1>
            <p className="text-sm text-muted-foreground">نظرة شاملة على أرباح الحجوزات والعملاء والموظفين</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm text-muted-foreground whitespace-nowrap">من:</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="max-w-[180px]" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm text-muted-foreground whitespace-nowrap">إلى:</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="max-w-[180px]" />
            </div>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="نوع الحجز" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="hotel">فنادق</SelectItem>
                <SelectItem value="flight">طيران</SelectItem>
                <SelectItem value="car_rental">سيارات</SelectItem>
                <SelectItem value="transport">نقل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <ProfitSummaryCards
            totalRevenue={summary.totalRevenue}
            totalCosts={summary.totalCosts}
            netProfit={summary.netProfit}
            profitMargin={summary.profitMargin}
          />

          <Tabs defaultValue="overview" dir="rtl">
            <TabsList className="w-full flex flex-wrap">
              <TabsTrigger value="overview" className="flex-1">نظرة عامة</TabsTrigger>
              <TabsTrigger value="bookings" className="flex-1">الحجوزات ({bookings.length})</TabsTrigger>
              <TabsTrigger value="customers" className="flex-1">العملاء ({customerProfits.length})</TabsTrigger>
              <TabsTrigger value="employees" className="flex-1">الموظفين ({employeeProfits.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ProfitOverviewTab monthlyProfits={monthlyProfits} summary={summary} />
            </TabsContent>

            <TabsContent value="bookings">
              <Card className="shadow-md">
                <CardContent className="p-0 sm:p-4">
                  <BookingProfitsTab bookings={bookings} searchTerm={searchTerm} typeFilter={typeFilter} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers">
              <Card className="shadow-md">
                <CardContent className="p-0 sm:p-4">
                  <CustomerProfitsTab customers={customerProfits} searchTerm={searchTerm} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employees">
              <Card className="shadow-md">
                <CardContent className="p-0 sm:p-4">
                  <EmployeeProfitsTab employees={employeeProfits} searchTerm={searchTerm} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ProfitAnalytics;
