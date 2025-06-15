
import Navbar from "@/components/Navbar";
import AdvancedSupplierManagement from "@/components/suppliers/AdvancedSupplierManagement";

const Suppliers = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Navbar />
      <div className="container py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-blue-900 mb-2">
            نظام إدارة الموردين المتقدم
          </h2>
          <p className="text-gray-600">
            إدارة شاملة للموردين مع دعم العملات المتعددة والجنيه المصري كعملة أساسية
          </p>
        </div>
        
        <AdvancedSupplierManagement />
      </div>
    </div>
  );
};

export default Suppliers;
