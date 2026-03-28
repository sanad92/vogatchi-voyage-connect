
import { Check } from 'lucide-react';

interface Step {
  title: string;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const WizardStepIndicator = ({ steps, currentStep }: WizardStepIndicatorProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                currentStep > i
                  ? 'bg-primary text-primary-foreground border-primary'
                  : currentStep === i
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-muted-foreground/30 text-muted-foreground'
              }`}
            >
              {currentStep > i ? <Check className="h-5 w-5" /> : i + 1}
            </div>
            <span
              className={`text-xs mt-1 text-center ${
                currentStep >= i ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              {step.title}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-2 mt-[-16px] ${
                currentStep > i ? 'bg-primary' : 'bg-muted-foreground/20'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default WizardStepIndicator;
