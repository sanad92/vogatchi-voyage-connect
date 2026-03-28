
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, UserPlus, Edit, ArrowLeft, ArrowRight } from "lucide-react";
import { useCustomerForm } from "@/hooks/useCustomerForm";
import { useEnhancedCustomerValidation } from "@/hooks/useEnhancedCustomerValidation";
import CustomerFormFields from "./CustomerFormFields";
import DuplicateCustomerAlert from "./DuplicateCustomerAlert";
import { Customer, CustomerData } from "@/types/customer";
import WizardStepIndicator from "@/components/wizard/WizardStepIndicator";

interface EnhancedCustomerFormProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  onCancel: () => void;
  onViewCustomer?: (customerId: string) => void;
  initialData?: Partial<CustomerData>;
  isEditMode?: boolean;
  customerId?: string;
}

const customerSteps = [
  { title: 'البيانات الأساسية' },
  { title: 'بيانات إضافية ومراجعة' },
];

const EnhancedCustomerForm = ({ 
  onCustomerAdded, 
  onCustomerUpdated, 
  onCancel,
  onViewCustomer,
  initialData, 
  isEditMode = false,
  customerId 
}: EnhancedCustomerFormProps) => {
  const [duplicateResult, setDuplicateResult] = useState<any>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [allowSubmission, setAllowSubmission] = useState(false);
  const [step, setStep] = useState(0);
  const [step1Errors, setStep1Errors] = useState<string[]>([]);

  const { register, handleSubmit, errors, control, isSubmitting, onSubmit, watch, trigger } = useCustomerForm({
    onCustomerAdded,
    onCustomerUpdated,
    initialData,
    isEditMode,
    customerId
  });

  const { checkCustomerDuplication, normalizePhoneNumber } = useEnhancedCustomerValidation();

  const watchedPhone = watch('phone');
  const watchedEmail = watch('email');
  const watchedName = watch('name');

  useEffect(() => {
    const checkForDuplicates = async () => {
      if (!watchedPhone || watchedPhone.length < 10) {
        setDuplicateResult(null);
        return;
      }

      setIsCheckingDuplicate(true);
      try {
        const result = await checkCustomerDuplication({
          phone: watchedPhone,
          email: watchedEmail,
          name: watchedName
        }, customerId);
        setDuplicateResult(result);
        setAllowSubmission(!result.hasDuplication);
      } catch (error) {
        console.error('خطأ في فحص التكرار:', error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const timeoutId = setTimeout(checkForDuplicates, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedPhone, watchedEmail, watchedName, customerId]);

  const handleGoToStep2 = async () => {
    const valid = await trigger(['name', 'phone', 'email']);
    if (valid) {
      setStep1Errors([]);
      setStep(1);
    } else {
      const errs: string[] = [];
      if (errors.name) errs.push(errors.name.message || 'اسم العميل مطلوب');
      if (errors.phone) errs.push(errors.phone.message || 'رقم الهاتف مطلوب');
      if (errors.email) errs.push(errors.email.message || 'البريد الإلكتروني غير صحيح');
      setStep1Errors(errs);
    }
  };

  const handleFormSubmit = async (data: CustomerData) => {
    if (!allowSubmission && duplicateResult?.hasDuplication) return;

    const formattedData = {
      ...data,
      phone: normalizePhoneNumber(data.phone),
      email: data.email?.toLowerCase().trim()
    };

    await onSubmit(formattedData);
  };

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
      
      <CardContent className="space-y-4">
        <WizardStepIndicator steps={customerSteps} currentStep={step} />

        {isCheckingDuplicate && (
          <div className="text-center py-2">
            <div className="text-sm text-muted-foreground">جاري فحص تكرار البيانات...</div>
          </div>
        )}

        {duplicateResult?.hasDuplication && (
          <DuplicateCustomerAlert
            duplicateResult={duplicateResult}
            onViewCustomer={onViewCustomer}
            onContinueAnyway={() => setAllowSubmission(true)}
            showContinueOption={isEditMode}
          />
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {step === 0 && (
            <>
              <CustomerFormFields register={register} errors={errors} control={control} step={1} />
              {step1Errors.length > 0 && (
                <div className="text-sm text-destructive space-y-1">
                  {step1Errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleGoToStep2}>
                  التالي <ArrowLeft className="h-4 w-4 mr-1" />
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <CustomerFormFields register={register} errors={errors} control={control} step={2} />
              
              {/* Review summary */}
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <h4 className="font-semibold mb-2">ملخص البيانات الأساسية</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">الاسم: </span><span className="font-medium">{watchedName || '—'}</span></div>
                  <div><span className="text-muted-foreground">الهاتف: </span><span className="font-medium">{watchedPhone || '—'}</span></div>
                  <div><span className="text-muted-foreground">البريد: </span><span className="font-medium">{watchedEmail || '—'}</span></div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  <ArrowRight className="h-4 w-4 ml-1" /> رجوع
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || isCheckingDuplicate || (!allowSubmission && duplicateResult?.hasDuplication)} 
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'جاري الحفظ...' : submitText}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  إلغاء
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default EnhancedCustomerForm;
