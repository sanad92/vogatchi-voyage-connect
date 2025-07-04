
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import EnhancedCustomerForm from '@/components/customers/EnhancedCustomerForm';
import { Customer } from '@/types/customer';

const NewCustomer = () => {
  const navigate = useNavigate();

  const handleCustomerAdded = (customer: Customer) => {
    console.log('Customer added:', customer);
    navigate('/customers');
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">عميل جديد</h1>
        </div>
      </div>

      <EnhancedCustomerForm 
        onCustomerAdded={handleCustomerAdded}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default NewCustomer;
