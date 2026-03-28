
import { useState, useEffect, useCallback, useRef } from 'react';

export interface WizardStepConfig {
  title: string;
  icon?: string;
  validate?: (data: Record<string, any>) => Record<string, string>;
}

interface UseWizardFormOptions {
  steps: WizardStepConfig[];
  draftKey?: string;
  initialData?: Record<string, any>;
  autoSaveInterval?: number; // ms, default 30000
}

export function useWizardForm({ steps, draftKey, initialData = {}, autoSaveInterval = 30000 }: UseWizardFormOptions) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const dataRef = useRef(formData);
  dataRef.current = formData;

  // Check for existing draft on mount
  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        JSON.parse(saved);
        setHasDraft(true);
      } catch { /* ignore */ }
    }
  }, [draftKey]);

  // Auto-save draft
  useEffect(() => {
    if (!draftKey || !draftLoaded) return;
    const interval = setInterval(() => {
      localStorage.setItem(draftKey, JSON.stringify(dataRef.current));
    }, autoSaveInterval);
    return () => clearInterval(interval);
  }, [draftKey, autoSaveInterval, draftLoaded]);

  const saveDraft = useCallback(() => {
    if (!draftKey) return;
    localStorage.setItem(draftKey, JSON.stringify(formData));
  }, [draftKey, formData]);

  const loadDraft = useCallback(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
        setHasDraft(false);
        setDraftLoaded(true);
      } catch { /* ignore */ }
    }
  }, [draftKey]);

  const dismissDraft = useCallback(() => {
    setHasDraft(false);
    setDraftLoaded(true);
  }, []);

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  }, [draftKey]);

  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error for this field
    setErrors(prev => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  }, []);

  const updateFields = useCallback((fields: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const step = steps[currentStep];
    if (!step?.validate) return true;
    const stepErrors = step.validate(formData);
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [currentStep, steps, formData]);

  const goNext = useCallback(() => {
    if (!validateCurrentStep()) return false;
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setErrors({});
      saveDraft();
      return true;
    }
    return false;
  }, [currentStep, steps.length, validateCurrentStep, saveDraft]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setErrors({});
      return true;
    }
    return false;
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    // Only allow going to completed steps or current+1 with validation
    if (step < currentStep) {
      setCurrentStep(step);
      setErrors({});
    } else if (step === currentStep + 1) {
      return goNext();
    }
    return true;
  }, [currentStep, goNext]);

  return {
    currentStep,
    formData,
    errors,
    hasDraft,
    totalSteps: steps.length,
    stepConfig: steps[currentStep],
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    updateField,
    updateFields,
    setFormData,
    goNext,
    goBack,
    goToStep,
    validateCurrentStep,
    saveDraft,
    loadDraft,
    dismissDraft,
    clearDraft,
    setCurrentStep,
  };
}
