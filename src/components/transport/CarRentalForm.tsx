
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { useEmployees } from '@/hooks/useEmployees';
import { useCarRentalForm } from '@/hooks/useCarRentalForm';
import CustomerSupplierSection from './car-rental/CustomerSupplierSection';
import VehicleDetailsSection from './car-rental/VehicleDetailsSection';
import RentalDatesLocationsSection from './car-rental/RentalDatesLocationsSection';
import CostsPaymentsSection from './car-rental/CostsPaymentsSection';
import AdditionalInfoSection from './car-rental/AdditionalInfoSection';

const CarRentalForm = () => {
  const { suppliers, suppliersLoading } = useSuppliers();
  const { vehicleTypes, vehicleTypesLoading } = useVehicleTypes();
  const { employees, employeesLoading } = useEmployees();
  
  const {
    formData,
    handleChange,
    handleSelectChange,
    handleSubmit,
    isAddingRental
  } = useCarRentalForm();

  if (suppliersLoading || vehicleTypesLoading || employeesLoading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إضافة عقد إيجار سيارة</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => handleSubmit(e, suppliers)} className="space-y-6">
          {/* معلومات أساسية */}
          <div>
            <h3 className="text-lg font-medium mb-4">معلومات أساسية</h3>
            <CustomerSupplierSection
              formData={formData}
              suppliers={suppliers}
              suppliersLoading={suppliersLoading}
              onInputChange={handleChange}
              onSelectChange={handleSelectChange}
            />
          </div>

          {/* تفاصيل السيارة */}
          <div>
            <h3 className="text-lg font-medium mb-4">تفاصيل السيارة</h3>
            <VehicleDetailsSection
              formData={formData}
              vehicleTypes={vehicleTypes}
              vehicleTypesLoading={vehicleTypesLoading}
              onSelectChange={handleSelectChange}
            />
          </div>

          {/* تواريخ ومواقع الإيجار */}
          <div>
            <h3 className="text-lg font-medium mb-4">تواريخ ومواقع الإيجار</h3>
            <RentalDatesLocationsSection
              formData={formData}
              onInputChange={handleChange}
            />
          </div>

          {/* التكاليف والمدفوعات */}
          <div>
            <h3 className="text-lg font-medium mb-4">التكاليف والمدفوعات</h3>
            <CostsPaymentsSection
              formData={formData}
              onInputChange={handleChange}
              onSelectChange={handleSelectChange}
            />
          </div>

          {/* معلومات إضافية */}
          <div>
            <h3 className="text-lg font-medium mb-4">معلومات إضافية</h3>
            <AdditionalInfoSection
              formData={formData}
              employees={employees}
              employeesLoading={employeesLoading}
              onInputChange={handleChange}
              onSelectChange={handleSelectChange}
            />
          </div>

          <Button type="submit" disabled={isAddingRental}>
            {isAddingRental ? "يتم الإرسال..." : "إضافة عقد الإيجار"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CarRentalForm;
