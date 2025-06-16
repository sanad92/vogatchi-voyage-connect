
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  TrendingUp,
  Users,
  Award,
  AlertTriangle,
  Send
} from "lucide-react";
import { Customer } from "@/types/customer";

interface CustomerSatisfactionTrackerProps {
  customers: Customer[];
  selectedCustomers: string[];
}

const CustomerSatisfactionTracker = ({ customers, selectedCustomers }: CustomerSatisfactionTrackerProps) => {
  const [isSurveyDialogOpen, setIsSurveyDialogOpen] = useState(false);
  const [surveyMessage, setSurveyMessage] = useState("");

  const selectedCustomersData = customers.filter(customer => 
    selectedCustomers.includes(customer.id)
  );

  // بيانات وهمية لاستطلاعات الرضا
  const satisfactionData = [
    {
      id: '1',
      customer_name: 'أحمد محمد',
      booking_reference: 'VT-2024-001234',
      overall_rating: 5,
      service_rating: 5,
      communication_rating: 4,
      feedback: 'خدمة ممتازة، كل شيء كان مثالي!',
      submitted_at: '2024-01-15',
      status: 'completed'
    },
    {
      id: '2',
      customer_name: 'فاطمة علي',
      booking_reference: 'VT-2024-001235',
      overall_rating: 4,
      service_rating: 4,
      communication_rating: 5,
      feedback: 'تجربة جيدة جداً، التواصل كان سريع ومفيد',
      submitted_at: '2024-01-14',
      status: 'completed'
    },
    {
      id: '3',
      customer_name: 'محمد السالم',
      booking_reference: 'VT-2024-001236',
      overall_rating: 3,
      service_rating: 3,
      communication_rating: 3,
      feedback: 'الخدمة كانت جيدة لكن يحتاج تحسين في أوقات الرد',
      submitted_at: '2024-01-13',
      status: 'completed'
    },
    {
      id: '4',
      customer_name: 'نورا خالد',
      booking_reference: 'VT-2024-001237',
      overall_rating: 2,
      service_rating: 2,
      communication_rating: 1,
      feedback: 'تأخر في الرد وبعض المشاكل في الحجز',
      submitted_at: '2024-01-12',
      status: 'completed'
    }
  ];

  // إحصائيات الرضا
  const satisfactionStats = {
    totalSurveys: satisfactionData.length,
    averageRating: satisfactionData.reduce((sum, s) => sum + s.overall_rating, 0) / satisfactionData.length,
    positiveRate: (satisfactionData.filter(s => s.overall_rating >= 4).length / satisfactionData.length) * 100,
    responseRate: 85, // معدل الاستجابة
    npsScore: 42 // صافي نقاط الترويج
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-100 text-green-800';
    if (rating >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleSendSurvey = () => {
    selectedCustomersData.forEach(customer => {
      console.log(`Sending satisfaction survey to ${customer.name}: ${surveyMessage}`);
    });
    
    setIsSurveyDialogOpen(false);
    setSurveyMessage("");
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      ))}
      <span className={`ml-2 font-medium ${getRatingColor(rating)}`}>
        {rating}/5
      </span>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ThumbsUp className="h-5 w-5" />
          متابعة رضا العملاء
        </CardTitle>
        
        <Dialog open={isSurveyDialogOpen} onOpenChange={setIsSurveyDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={selectedCustomers.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              إرسال استطلاع
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إرسال استطلاع رضا العملاء</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  العملاء المحددين ({selectedCustomersData.length})
                </label>
                <div className="max-h-32 overflow-y-auto space-y-2 bg-gray-50 p-3 rounded-lg">
                  {selectedCustomersData.map(customer => (
                    <div key={customer.id} className="flex items-center justify-between text-sm">
                      <span>{customer.name}</span>
                      <span className="text-gray-500">{customer.email}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">رسالة الاستطلاع</label>
                <Textarea
                  value={surveyMessage}
                  onChange={(e) => setSurveyMessage(e.target.value)}
                  placeholder="نود معرفة رأيك في خدماتنا لتحسين تجربتك معنا..."
                  rows={4}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  💡 سيتم إرسال رابط الاستطلاع مع الرسالة المخصصة للعملاء المحددين
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSendSurvey}
                  disabled={!surveyMessage.trim()}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  إرسال الاستطلاع ({selectedCustomersData.length})
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsSurveyDialogOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* إحصائيات الرضا */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="font-bold text-lg">{satisfactionStats.totalSurveys}</p>
            <p className="text-sm text-gray-600">إجمالي الاستطلاعات</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Star className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="font-bold text-lg">{satisfactionStats.averageRating.toFixed(1)}</p>
            <p className="text-sm text-gray-600">متوسط التقييم</p>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <ThumbsUp className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="font-bold text-lg">{Math.round(satisfactionStats.positiveRate)}%</p>
            <p className="text-sm text-gray-600">تقييمات إيجابية</p>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <MessageCircle className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="font-bold text-lg">{satisfactionStats.responseRate}%</p>
            <p className="text-sm text-gray-600">معدل الاستجابة</p>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Award className="h-8 w-8 mx-auto text-orange-600 mb-2" />
            <p className="font-bold text-lg">{satisfactionStats.npsScore}</p>
            <p className="text-sm text-gray-600">نقاط NPS</p>
          </div>
        </div>

        {/* رسم بياني للتقييمات */}
        <div>
          <h4 className="font-semibold mb-3">توزيع التقييمات</h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = satisfactionData.filter(s => s.overall_rating === rating).length;
              const percentage = (count / satisfactionData.length) * 100;
              
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm">{rating}</span>
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <span className="text-sm w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* آخر التقييمات */}
        <div>
          <h4 className="font-semibold mb-3">آخر تقييمات العملاء</h4>
          <div className="space-y-3">
            {satisfactionData.slice(0, 5).map(survey => (
              <div key={survey.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="font-medium">{survey.customer_name}</h5>
                    <p className="text-sm text-gray-600">{survey.booking_reference}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getRatingBadgeColor(survey.overall_rating)}>
                      {survey.overall_rating}/5
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{survey.submitted_at}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-600">التقييم العام:</span>
                    <StarRating rating={survey.overall_rating} />
                  </div>
                  <div>
                    <span className="text-gray-600">جودة الخدمة:</span>
                    <StarRating rating={survey.service_rating} />
                  </div>
                  <div>
                    <span className="text-gray-600">التواصل:</span>
                    <StarRating rating={survey.communication_rating} />
                  </div>
                </div>

                {survey.feedback && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm">{survey.feedback}</p>
                  </div>
                )}

                {survey.overall_rating <= 3 && (
                  <div className="mt-3 flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">يحتاج متابعة لتحسين الخدمة</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* توصيات التحسين */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            توصيات لتحسين رضا العملاء
          </h4>
          <ul className="text-sm space-y-1 text-blue-700">
            <li>• متابعة العملاء ذوي التقييمات المنخفضة وحل مشاكلهم</li>
            <li>• تحسين أوقات الاستجابة في خدمة العملاء</li>
            <li>• إرسال استطلاعات دورية للحصول على ملاحظات مستمرة</li>
            <li>• تطوير برنامج تدريبي للموظفين بناءً على ملاحظات العملاء</li>
            <li>• إنشاء نظام مكافآت للعملاء الذين يقدمون تقييمات إيجابية</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerSatisfactionTracker;
