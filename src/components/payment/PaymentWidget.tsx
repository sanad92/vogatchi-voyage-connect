import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { PaymentForm } from './PaymentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, DollarSign } from 'lucide-react';
import { usePayment } from '@/hooks/usePayment';
import { useToast } from '@/hooks/use-toast';

interface PaymentWidgetProps {
  amount: number;
  currency?: string;
  invoiceId?: string;
  bookingId?: string;
  description?: string;
  onPaymentSuccess?: (paymentIntent: any) => void;
  onPaymentError?: (error: string) => void;
}

export const PaymentWidget: React.FC<PaymentWidgetProps> = ({
  amount,
  currency = 'egp',
  invoiceId,
  bookingId,
  description,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { createPaymentIntent, isLoading } = usePayment();
  const { toast } = useToast();

  const handleStartPayment = async () => {
    try {
      const result = await createPaymentIntent({
        amount,
        currency,
        invoiceId,
        bookingId,
        description
      });

      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setShowPaymentForm(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في بدء عملية الدفع';
      toast({
        title: 'خطأ في الدفع',
        description: errorMessage,
        variant: 'destructive'
      });
      onPaymentError?.(errorMessage);
    }
  };

  const handlePaymentSuccess = (paymentIntent: any) => {
    setShowPaymentForm(false);
    setClientSecret(null);
    toast({
      title: 'تم الدفع بنجاح',
      description: 'تمت عملية الدفع بنجاح',
      variant: 'default'
    });
    onPaymentSuccess?.(paymentIntent);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: 'فشل في الدفع',
      description: error,
      variant: 'destructive'
    });
    onPaymentError?.(error);
  };

  if (showPaymentForm && clientSecret) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            إتمام عملية الدفع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Elements 
            stripe={stripePromise} 
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0570de',
                  colorBackground: '#ffffff',
                  colorText: '#30313d',
                  colorDanger: '#df1b41',
                  fontFamily: 'Arial, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '6px'
                }
              },
              locale: 'ar'
            }}
          >
            <PaymentForm
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={() => setShowPaymentForm(false)}
            />
          </Elements>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          الدفع الإلكتروني
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {amount.toLocaleString()} {currency.toUpperCase()}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">
              {description}
            </p>
          )}
        </div>
        
        <Button 
          onClick={handleStartPayment}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              جارٍ التحضير...
            </div>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              ادفع الآن
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};