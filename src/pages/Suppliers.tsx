
import AdvancedSupplierManagement from "@/components/suppliers/AdvancedSupplierManagement";

const Suppliers = () => {
  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          نظام إدارة الموردين
        </h2>
        <p className="text-sm text-muted-foreground">
          إدارة شاملة للموردين مع دعم العملات المتعددة
        </p>
      </div>
      
      <AdvancedSupplierManagement />
    </div>
  );
};

export default Suppliers;
