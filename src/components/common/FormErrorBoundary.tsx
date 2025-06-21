
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FormErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

interface FormErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class FormErrorBoundary extends React.Component<FormErrorBoundaryProps, FormErrorBoundaryState> {
  constructor(props: FormErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FormErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Form Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p>حدث خطأ في النموذج. يرجى المحاولة مرة أخرى.</p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <p className="text-xs text-red-600">{this.state.error.message}</p>
              )}
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                إعادة المحاولة
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default FormErrorBoundary;
