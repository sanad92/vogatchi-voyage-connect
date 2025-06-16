
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, User, Phone, Mail, Users, Eye } from "lucide-react";

interface DuplicateCustomerAlertProps {
  duplicateResult: {
    hasDuplication: boolean;
    phoneResult: {
      isDuplicate: boolean;
      existingCustomer?: any;
      message?: string;
      duplicateCount?: number;
      allDuplicates?: any[];
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
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-red-100 rounded-lg">
              <Phone className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800">تكرار في رقم الهاتف:</div>
                <div className="text-sm text-red-700">{phoneResult.message}</div>
                {phoneResult.duplicateCount && phoneResult.duplicateCount > 1 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-3 w-3 text-orange-600" />
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {phoneResult.duplicateCount} عملاء مكررين
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            
            {/* عرض جميع العملاء المكررين */}
            {phoneResult.allDuplicates && phoneResult.allDuplicates.length > 1 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-sm font-medium text-orange-800 mb-2">
                  جميع العملاء ذوي نفس الرقم:
                </div>
                <div className="space-y-1">
                  {phoneResult.allDuplicates.slice(0, 3).map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-orange-700">{customer.name}</span>
                        <span className="text-orange-600 mr-2">({customer.phone})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewCustomer?.(customer.id)}
                        className="h-6 px-2 text-orange-700 hover:bg-orange-100"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {phoneResult.allDuplicates.length > 3 && (
                    <div className="text-xs text-orange-600 mt-1">
                      و {phoneResult.allDuplicates.length - 3} عملاء آخرين...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {emailResult.isDuplicate && (
          <div className="flex items-center gap-2 p-3 bg-red-100 rounded-lg">
            <Mail className="h-4 w-4 text-red-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-800">تكرار في البريد الإلكتروني:</div>
              <div className="text-sm text-red-700">{emailResult.message}</div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2 mt-4">
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
          
          {phoneResult.allDuplicates && phoneResult.allDuplicates.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
              onClick={() => {
                // يمكن إضافة نافذة لعرض جميع العملاء المكررين
                console.log('عرض جميع المكررين:', phoneResult.allDuplicates);
              }}
            >
              <Users className="h-4 w-4 mr-1" />
              عرض الكل ({phoneResult.allDuplicates.length})
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
