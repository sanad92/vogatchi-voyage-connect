
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { logError } from '@/utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorId: this.generateErrorId() 
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((resetKey, idx) => 
        prevProps.resetKeys?.[idx] !== resetKey
      )) {
        this.resetErrorBoundary();
      }
    }
    
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Enhanced Error Boundary caught an error:', error, errorInfo);
    
    this.setState({ error, errorInfo });
    
    // Log error for monitoring
    logError({
      code: 'COMPONENT_ERROR',
      message: error.message,
      details: {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'EnhancedErrorBoundary',
        errorId: this.state.errorId
      },
      timestamp: new Date()
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        errorId: this.generateErrorId()
      });
    }, 0);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-xl text-red-700">حدث خطأ في النظام</CardTitle>
              <p className="text-sm text-gray-500">معرف الخطأ: {this.state.errorId}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center">
                نعتذر، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 p-3 rounded-lg text-sm">
                  <strong>خطأ تطويري:</strong>
                  <pre className="mt-2 text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">تفاصيل المكون</summary>
                      <pre className="mt-1 text-xs">{this.state.errorInfo.componentStack}</pre>
                    </details>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 justify-center">
                <Button onClick={this.resetErrorBoundary} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  إعادة المحاولة
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  الصفحة الرئيسية
                </Button>
                <Button onClick={this.handleReload}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  إعادة تحميل الصفحة
                </Button>
              </div>
              
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const errorDetails = {
                      message: this.state.error?.message,
                      stack: this.state.error?.stack,
                      componentStack: this.state.errorInfo?.componentStack,
                      errorId: this.state.errorId,
                      url: window.location.href,
                      userAgent: navigator.userAgent,
                      timestamp: new Date().toISOString()
                    };
                    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
                  }}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  نسخ تفاصيل الخطأ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
