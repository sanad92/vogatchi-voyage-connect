
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Users,
  DollarSign,
  Brain,
  Zap
} from "lucide-react";
import { Customer } from "@/types/customer";

interface PredictiveAnalyticsProps {
  customers: Customer[];
}

interface Prediction {
  customerId: string;
  customerName: string;
  churnRisk: number;
  nextPurchaseProbability: number;
  predictedValue: number;
  recommendedActions: string[];
  riskFactors: string[];
}

const PredictiveAnalytics = ({ customers }: PredictiveAnalyticsProps) => {
  
  // خوارزميات التنبؤ البسيطة
  const predictions = useMemo(() => {
    return customers.map(customer => {
      const daysSinceLastBooking = customer.last_booking_date ? 
        Math.floor((Date.now() - new Date(customer.last_booking_date).getTime()) / (1000 * 60 * 60 * 24)) : 999;
      
      const avgBookingValue = customer.total_spent && customer.total_bookings ? 
        customer.total_spent / customer.total_bookings : 0;
      
      // حساب مخاطر الفقدان
      let churnRisk = 0;
      if (daysSinceLastBooking > 365) churnRisk += 70;
      else if (daysSinceLastBooking > 180) churnRisk += 40;
      else if (daysSinceLastBooking > 90) churnRisk += 20;
      
      if ((customer.total_bookings || 0) === 1) churnRisk += 15;
      if (avgBookingValue < 5000) churnRisk += 10;
      
      churnRisk = Math.min(churnRisk, 95);
      
      // حساب احتمالية الشراء التالي
      let nextPurchaseProbability = 100 - churnRisk;
      if ((customer.total_bookings || 0) > 3) nextPurchaseProbability += 15;
      if (avgBookingValue > 20000) nextPurchaseProbability += 10;
      if (daysSinceLastBooking < 30) nextPurchaseProbability += 20;
      
      nextPurchaseProbability = Math.min(nextPurchaseProbability, 95);
      
      // التنبؤ بالقيمة التالية
      const predictedValue = avgBookingValue * (1 + (customer.total_bookings || 0) * 0.1);
      
      // توصيات وعوامل الخطر
      const riskFactors = [];
      const recommendedActions = [];
      
      if (daysSinceLastBooking > 180) {
        riskFactors.push('عدم النشاط لفترة طويلة');
        recommendedActions.push('حملة إعادة تفعيل');
      }
      
      if ((customer.total_bookings || 0) === 1) {
        riskFactors.push('عميل جديد');
        recommendedActions.push('برنامج ترحيب');
      }
      
      if (avgBookingValue < 5000) {
        riskFactors.push('قيمة حجز منخفضة');
        recommendedActions.push('عروض ترقية');
      }
      
      if (nextPurchaseProbability > 70) {
        recommendedActions.push('عرض منتجات premium');
      }
      
      if (churnRisk > 50) {
        recommendedActions.push('خصم خاص للاحتفاظ');
      }

      return {
        customerId: customer.id,
        customerName: customer.name,
        churnRisk,
        nextPurchaseProbability,
        predictedValue,
        recommendedActions,
        riskFactors
      };
    }).sort((a, b) => b.churnRisk - a.churnRisk);
  }, [customers]);

  // إحصائيات عامة
  const analytics = useMemo(() => {
    const highRiskCustomers = predictions.filter(p => p.churnRisk > 60);
    const highValueOpportunities = predictions.filter(p => p.nextPurchaseProbability > 70 && p.predictedValue > 15000);
    const avgChurnRisk = predictions.reduce((sum, p) => sum + p.churnRisk, 0) / predictions.length;
    const totalPredictedRevenue = predictions.reduce((sum, p) => sum + p.predictedValue * (p.nextPurchaseProbability / 100), 0);
    
    return {
      highRiskCustomers: highRiskCustomers.length,
      highValueOpportunities: highValueOpportunities.length,
      avgChurnRisk,
      totalPredictedRevenue
    };
  }, [predictions]);

  const getRiskColor = (risk: number) => {
    if (risk > 70) return 'text-red-600';
    if (risk > 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBadgeColor = (risk: number) => {
    if (risk > 70) return 'bg-red-100 text-red-800';
    if (risk > 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getProbabilityColor = (prob: number) => {
    if (prob > 70) return 'text-green-600';
    if (prob > 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* إحصائيات التنبؤ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="font-bold text-2xl">{analytics.highRiskCustomers}</p>
            <p className="text-sm text-gray-600">عملاء عالي المخاطر</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="font-bold text-2xl">{analytics.highValueOpportunities}</p>
            <p className="text-sm text-gray-600">فرص عالية القيمة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingDown className="h-8 w-8 mx-auto text-orange-600 mb-2" />
            <p className="font-bold text-2xl">{Math.round(analytics.avgChurnRisk)}%</p>
            <p className="text-sm text-gray-600">متوسط مخاطر الفقدان</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="font-bold text-2xl">
              {Math.round(analytics.totalPredictedRevenue).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">إيرادات متوقعة (ج.م)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            التحليلات التنبؤية للعملاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictions.slice(0, 20).map(prediction => (
              <div key={prediction.customerId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{prediction.customerName}</h4>
                    <p className="text-sm text-gray-600">ID: {prediction.customerId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getRiskBadgeColor(prediction.churnRisk)}>
                      مخاطر فقدان: {Math.round(prediction.churnRisk)}%
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      احتمالية شراء: {Math.round(prediction.nextPurchaseProbability)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-gray-600">مخاطر الفقدان</label>
                    <div className="flex items-center gap-2">
                      <Progress value={prediction.churnRisk} className="flex-1" />
                      <span className={`text-sm font-bold ${getRiskColor(prediction.churnRisk)}`}>
                        {Math.round(prediction.churnRisk)}%
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">احتمالية الشراء التالي</label>
                    <div className="flex items-center gap-2">
                      <Progress value={prediction.nextPurchaseProbability} className="flex-1" />
                      <span className={`text-sm font-bold ${getProbabilityColor(prediction.nextPurchaseProbability)}`}>
                        {Math.round(prediction.nextPurchaseProbability)}%
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">القيمة المتوقعة</label>
                    <p className="font-bold text-green-600">
                      {Math.round(prediction.predictedValue).toLocaleString()} ج.م
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-red-600 mb-2 block">عوامل الخطر</label>
                    <div className="space-y-1">
                      {prediction.riskFactors.map((factor, index) => (
                        <div key={index} className="text-sm text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {factor}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-blue-600 mb-2 block">الإجراءات المقترحة</label>
                    <div className="space-y-1">
                      {prediction.recommendedActions.map((action, index) => (
                        <div key={index} className="text-sm text-blue-600 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* رؤى تحليلية إضافية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              أفضل الفرص
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions
                .filter(p => p.nextPurchaseProbability > 70)
                .slice(0, 5)
                .map(prediction => (
                  <div key={prediction.customerId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">{prediction.customerName}</p>
                      <p className="text-sm text-green-600">
                        احتمالية: {Math.round(prediction.nextPurchaseProbability)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {Math.round(prediction.predictedValue).toLocaleString()} ج.م
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              يحتاج اهتمام فوري
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions
                .filter(p => p.churnRisk > 60)
                .slice(0, 5)
                .map(prediction => (
                  <div key={prediction.customerId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium">{prediction.customerName}</p>
                      <p className="text-sm text-red-600">
                        مخاطر: {Math.round(prediction.churnRisk)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        عاجل
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;
