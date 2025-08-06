
import Navbar from "@/components/Navbar";
import AdvancedSupplierManagement from "@/components/suppliers/AdvancedSupplierManagement";

const Suppliers = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="w-full px-4 md:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            نظام إدارة الموردين المتقدم
          </h2>
          <p className="text-muted-foreground">
            إدارة شاملة للموردين مع دعم العملات المتعددة والجنيه المصري كعملة أساسية
          </p>
        </div>
        
        <AdvancedSupplierManagement />
      </div>
    </div>
  );
};

export default Suppliers;
