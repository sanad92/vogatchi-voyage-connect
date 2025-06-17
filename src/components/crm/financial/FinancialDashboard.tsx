
import { DollarSign } from 'lucide-react';
import FinancialOverview from './FinancialOverview';
import FinancialTabs from './FinancialTabs';

const FinancialDashboard = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            النظام المالي المحسّن
          </h1>
          <p className="text-gray-600 mt-2">إدارة شاملة للمصروفات والحسابات البنكية وعقود الإيجار</p>
        </div>
      </div>

      {/* نظرة عامة مالية */}
      <FinancialOverview />

      {/* التبويبات الرئيسية */}
      <FinancialTabs />
    </div>
  );
};

export default FinancialDashboard;
