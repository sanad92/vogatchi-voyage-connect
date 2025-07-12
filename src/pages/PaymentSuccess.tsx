import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home, Receipt } from 'lucide-react';
import { usePayment } from '@/hooks/usePayment';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirmPayment } = usePayment();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent');
    
    if (paymentIntentId) {
      confirmPayment({ paymentIntentId })
        .then((result) => {
          setPaymentDetails(result);
        })
        .catch((error) => {
          console.error('Error confirming payment:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [searchParams, confirmPayment]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600">جارٍ تأكيد عملية الدفع...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-md mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              تم الدفع بنجاح!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentDetails && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">تفاصيل العملية</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>رقم العملية:</span>
                    <span className="font-mono">{paymentDetails.paymentIntent?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المبلغ:</span>
                    <span className="font-semibold">
                      {paymentDetails.paymentIntent?.amount} جنيه
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>الحالة:</span>
                    <span className="text-green-600">مدفوع</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-gray-600">
              شكراً لك! تمت عملية الدفع بنجاح وسيتم تحديث حالة طلبك قريباً.
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                العودة للرئيسية
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/invoices')}
                className="flex-1"
              >
                <Receipt className="h-4 w-4 mr-2" />
                الفواتير
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;