
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, Award } from "lucide-react";
import { useCRM } from "@/hooks/useCRM";

interface LoyaltyPointsDisplayProps {
  customerId: string;
  loyaltyPoints: number;
  onRedeemPoints?: (rewardId: string, points: number) => void;
}

const LoyaltyPointsDisplay = ({ customerId, loyaltyPoints, onRedeemPoints }: LoyaltyPointsDisplayProps) => {
  const { loyaltyRewards, redeemPoints, isRedeemingPoints } = useCRM();

  const availableRewards = loyaltyRewards?.filter(reward => 
    reward.points_required <= loyaltyPoints
  ) || [];

  const handleRedeem = (rewardId: string, pointsRequired: number) => {
    redeemPoints({
      customerId,
      rewardId,
      pointsToRedeem: pointsRequired
    });
    onRedeemPoints?.(rewardId, pointsRequired);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          نقاط الولاء
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-600">{loyaltyPoints}</div>
          <div className="text-sm text-gray-600">نقطة متاحة</div>
        </div>

        {availableRewards.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4" />
              المكافآت المتاحة
            </h4>
            {availableRewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{reward.name_ar}</div>
                  <div className="text-sm text-gray-600">{reward.description}</div>
                  <Badge variant="outline" className="mt-1">
                    {reward.points_required} نقطة
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleRedeem(reward.id, reward.points_required)}
                  disabled={isRedeemingPoints}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Award className="h-4 w-4 mr-2" />
                  استرداد
                </Button>
              </div>
            ))}
          </div>
        )}

        {availableRewards.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            لا توجد مكافآت متاحة حالياً
            <br />
            <span className="text-sm">احجز المزيد لتحصل على نقاط إضافية!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsDisplay;
