
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, UserPlus } from "lucide-react";
import { useCustomerForm } from "@/hooks/useCustomerForm";
import CustomerFormFields from "./CustomerFormFields";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  address?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
}

interface CustomerFormProps {
  onCustomerAdded: (customer: Customer) => void;
  onCancel: () => void;
  initialData?: Partial<CustomerData>;
}

const CustomerForm = ({ onCustomerAdded, onCancel, initialData }: CustomerFormProps) => {
  const { register, handleSubmit, errors, isSubmitting, onSubmit } = useCustomerForm({
    onCustomerAdded,
    initialData
  });

  return (
    <Card className="w-full border-blue-200 bg-blue-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg text-blue-800">إضافة عميل جديد</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CustomerFormFields register={register} errors={errors} />
          
          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ العميل'}
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
