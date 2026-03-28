
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import WizardStepIndicator from './WizardStepIndicator';

interface StepWizardProps {
  steps: { title: string }[];
  currentStep: number;
  children: ReactNode;
  onNext?: () => boolean | void;
  onBack?: () => void;
  hasDraft?: boolean;
  onLoadDraft?: () => void;
  onDismissDraft?: () => void;
  hideNavigation?: boolean;
}

const StepWizard = ({
  steps,
  currentStep,
  children,
  hasDraft,
  onLoadDraft,
  onDismissDraft,
}: StepWizardProps) => {
  return (
    <div className="space-y-4">
      <WizardStepIndicator steps={steps} currentStep={currentStep} />

      {hasDraft && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                يوجد مسودة محفوظة. هل تريد استكمالها؟
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onDismissDraft}>
                بدء جديد
              </Button>
              <Button size="sm" onClick={onLoadDraft}>
                استكمال المسودة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {children}
    </div>
  );
};

export const WizardNavButtons = ({
  onBack,
  onNext,
  nextLabel = 'التالي',
  backLabel = 'رجوع',
  isFirstStep = false,
  isSubmitting = false,
  submitLabel,
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  isFirstStep?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  nextDisabled?: boolean;
}) => (
  <div className="flex justify-between pt-4">
    {!isFirstStep ? (
      <Button variant="outline" onClick={onBack} type="button">
        <ArrowRight className="h-4 w-4 ml-1" />
        {backLabel}
      </Button>
    ) : (
      <div />
    )}
    <Button onClick={onNext} disabled={isSubmitting || nextDisabled} type="button">
      {isSubmitting ? 'جاري الحفظ...' : submitLabel || nextLabel}
      {!submitLabel && <ArrowLeft className="h-4 w-4 mr-1" />}
    </Button>
  </div>
);

export const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <p className="text-sm text-destructive mt-1">{error}</p>;
};

export default StepWizard;
