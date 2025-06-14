
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, UserPlus, Edit } from "lucide-react";
import { useCustomerForm } from "@/hooks/useCustomerForm";
import CustomerFormFields from "./CustomerFormFields";
import { Customer, CustomerData } from "@/types/customer";

interface CustomerFormProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  onCancel: () => void;
  initialData?: Partial<CustomerData>;
  isEditMode?: boolean;
  customerId?: string;
}

const CustomerForm = ({ 
  onCustomerAdded, 
  onCustomerUpdated, 
  onCancel, 
  initialData, 
  isEditMode = false,
  customerId 
}: CustomerFormProps) => {
  const { register, handleSubmit, errors, control, isSubmitting, onSubmit } = useCustomerForm({
    onCustomerAdded,
    onCustomerUpdated,
    initialData,
    isEditMode,
    customerId
  });

  const Icon = isEditMode ? Edit : UserPlus;
  const title = isEditMode ? 'تعديل معلومات العميل' : 'إضافة عميل جديد';
  const submitText = isEditMode ? 'حفظ التعديلات' : 'حفظ العميل';

  return (
    <Card className="w-full border-blue-200 bg-blue-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg text-blue-800">{title}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CustomerFormFields register={register} errors={errors} control={control} />
          
          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? (isEditMode ? 'جاري الحفظ...' : 'جاري الحفظ...') : submitText}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerForm;
