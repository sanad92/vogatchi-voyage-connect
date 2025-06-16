
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, Phone, Mail } from "lucide-react";

interface DuplicateCustomerAlertProps {
  duplicateResult: {
    hasDuplication: boolean;
    phoneResult: {
      isDuplicate: boolean;
      existingCustomer?: any;
      message?: string;
    };
    emailResult: {
      isDuplicate: boolean;
      existingCustomer?: any;
      message?: string;
    };
  };
  onViewCustomer?: (customerId: string) => void;
  onContinueAnyway?: () => void;
  showContinueOption?: boolean;
}

const DuplicateCustomerAlert = ({ 
  duplicateResult, 
  onViewCustomer,
  onContinueAnyway,
  showContinueOption = false
}: DuplicateCustomerAlertProps) => {
  if (!duplicateResult.hasDuplication) return null;

  const { phoneResult, emailResult } = duplicateResult;

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="space-y-3">
        <div className="font-medium text-red-800">
          تم العثور على عميل مشابه في النظام:
        </div>
        
        {phoneResult.isDuplicate && (
          <div className="flex items-center gap-2 p-2 bg-red-100 rounded">
            <Phone className="h-4 w-4 text-red-600" />
            <div>
              <div className="text-sm font-medium text-red-800">تكرار في رقم الهاتف:</div>
              <div className="text-sm text-red-700">{phoneResult.message}</div>
            </div>
          </div>
        )}
        
        {emailResult.isDuplicate && (
          <div className="flex items-center gap-2 p-2 bg-red-100 rounded">
            <Mail className="h-4 w-4 text-red-600" />
            <div>
              <div className="text-sm font-medium text-red-800">تكرار في البريد الإلكتروني:</div>
              <div className="text-sm text-red-700">{emailResult.message}</div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2 mt-3">
          {(phoneResult.existingCustomer || emailResult.existingCustomer) && onViewCustomer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const customerId = phoneResult.existingCustomer?.id || emailResult.existingCustomer?.id;
                if (customerId) onViewCustomer(customerId);
              }}
              className="text-red-700 border-red-300 hover:bg-red-100"
            >
              <User className="h-4 w-4 mr-1" />
              عرض العميل الموجود
            </Button>
          )}
          
          {showContinueOption && onContinueAnyway && (
            <Button
              variant="outline"
              size="sm"
              onClick={onContinueAnyway}
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              متابعة على أي حال
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DuplicateCustomerAlert;
