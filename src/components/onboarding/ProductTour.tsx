import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
  route?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'مرحباً بك في لوحة التحكم! 🎉',
    description: 'هنا يمكنك متابعة جميع الحجوزات والعملاء والإيرادات في مكان واحد.',
    route: '/dashboard',
  },
  {
    title: 'إدارة العملاء',
    description: 'أضف عملاءك وتابع حجوزاتهم وسجل تواصلهم معك.',
    targetSelector: '[href="/customers"]',
    route: '/dashboard',
  },
  {
    title: 'الحجوزات الفندقية',
    description: 'أنشئ حجوزات فندقية جديدة وتتبع حالاتها من التأكيد للإلغاء.',
    targetSelector: '[href="/hotel-bookings"]',
    route: '/dashboard',
  },
  {
    title: 'التقارير والإحصائيات',
    description: 'تابع أداء شركتك عبر تقارير مفصلة للأرباح والمصروفات.',
    targetSelector: '[href="/reports"]',
    route: '/dashboard',
  },
  {
    title: 'أنت جاهز! 🚀',
    description: 'ابدأ بإضافة أول عميل أو حجز. يمكنك دائماً الرجوع لهذا الدليل من الإعدادات.',
  },
];

const TOUR_STORAGE_KEY = 'product_tour_completed';

export const useProductTour = () => {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // Delay to let dashboard render first
      const timer = setTimeout(() => setShowTour(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setShowTour(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setShowTour(true);
  }, []);

  return { showTour, completeTour, resetTour };
};

interface ProductTourProps {
  onComplete: () => void;
}

const ProductTour = ({ onComplete }: ProductTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    if (step.targetSelector) {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 12,
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)),
        });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-md', 'relative', 'z-50');
        return () => {
          el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-md', 'relative', 'z-50');
        };
      }
    }
    // Center if no target
    setPosition({
      top: window.innerHeight / 2 - 100,
      left: window.innerWidth / 2 - 160,
    });
  }, [currentStep, step.targetSelector]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onComplete} />
      
      {/* Tooltip */}
      <div
        className="fixed z-50 w-[320px] bg-card border border-border rounded-xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ top: position.top, left: position.left }}
        dir="rtl"
      >
        <button
          onClick={onComplete}
          className="absolute top-3 left-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-xs text-muted-foreground font-medium">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        <h3 className="text-base font-bold text-foreground mb-1">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.description}</p>

        {/* Progress */}
        <div className="w-full bg-muted rounded-full h-1.5 mb-4">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4 ml-1" />
            السابق
          </Button>
          <Button size="sm" onClick={handleNext}>
            {currentStep === TOUR_STEPS.length - 1 ? 'إنهاء' : 'التالي'}
            {currentStep < TOUR_STEPS.length - 1 && <ChevronLeft className="w-4 h-4 mr-1" />}
          </Button>
        </div>
      </div>
    </>
  );
};

export default ProductTour;
