
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Gift, 
  Star, 
  TrendingUp, 
  Award,
  Users,
  Target,
  Plus,
  Crown
} from "lucide-react";
import { Customer } from "@/types/customer";
import { useCustomerService } from "@/hooks/useCustomerService";

interface CustomerLoyaltyManagerProps {
  customers: Customer[];
  selectedCustomers: string[];
}

const CustomerLoyaltyManager = ({ customers, selectedCustomers }: CustomerLoyaltyManagerProps) => {
  const { addNote } = useCustomerService();
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<string>("");
  const [customRewardPoints, setCustomRewardPoints] = useState<number>(0);
  const [rewardReason, setRewardReason] = useState<string>("");

  const selectedCustomersData = customers.filter(customer => 
    selectedCustomers.includes(customer.id)
  );

  // تحليل نقاط الولاء
  const loyaltyStats = {
    totalCustomers: customers.length,
    customersWithPoints: customers.filter(c => (c.loyalty_points || 0) > 0).length,
    averagePoints: customers.length > 0 ? 
      customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) / customers.length : 0,
    topLoyalCustomers: customers
      .filter(c => (c.loyalty_points || 0) > 0)
      .sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
      .slice(0, 5)
  };

  // مكافآت الولاء المتاحة
  const loyaltyRewards = [
    { id: 'discount_10', name: 'خصم 10%', points: 1000, description: 'خصم 10% على الحجز القادم' },
    { id: 'discount_15', name: 'خصم 15%', points: 1500, description: 'خصم 15% على الحجز القادم' },
    { id: 'free_upgrade', name: 'ترقية مجانية', points: 2000, description: 'ترقية مجانية للغرفة أو الدرجة' },
    { id: 'bonus_points', name: 'نقاط إضافية', points: 500, description: '500 نقطة إضافية' },
    { id: 'vip_service', name: 'خدمة VIP', points: 3000, description: 'خدمة VIP للرحلة القادمة' }
  ];

  const handleRewardCustomers = () => {
    selectedCustomersData.forEach(customer => {
      const reward = loyaltyRewards.find(r => r.id === selectedReward);
      const pointsToAdd = selectedReward === 'custom' ? customRewardPoints : (reward?.points || 0);
      
      // إضافة ملاحظة عن المكافأة
      addNote({
        customer_id: customer.id,
        note_type: 'general',
        content: `تم منح ${pointsToAdd} نقطة ولاء. السبب: ${rewardReason}`,
        priority: 'normal',
        is_private: false
      });
    });

    setIsRewardDialogOpen(false);
    setSelectedReward("");
    setCustomRewardPoints(0);
    setRewardReason("");
  };

  const getLoyaltyTier = (points: number) => {
    if (points >= 5000) return { name: 'Diamond', color: 'bg-purple-100 text-purple-800', icon: Crown };
    if (points >= 3000) return { name: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: Award };
    if (points >= 1500) return { name: 'Silver', color: 'bg-gray-100 text-gray-800', icon: Star };
    return { name: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: Target };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          إدارة برنامج الولاء
        </CardTitle>
        
        <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={selectedCustomers.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Gift className="h-4 w-4 mr-2" />
              منح مكافأة
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>منح مكافأة ولاء</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  العملاء المحددين ({selectedCustomersData.length})
                </label>
                <div className="max-h-32 overflow-y-auto space-y-2 bg-gray-50 p-3 rounded-lg">
                  {selectedCustomersData.map(customer => {
                    const tier = getLoyaltyTier(customer.loyalty_points || 0);
                    return (
                      <div key={customer.id} className="flex items-center justify-between text-sm">
                        <span>{customer.name}</span>
                        <div className="flex gap-2 items-center">
                          <Badge className={tier.color}>{tier.name}</Badge>
                          <span className="text-xs text-gray-500">
                            {customer.loyalty_points || 0} نقطة
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">نوع المكافأة</label>
                <div className="grid grid-cols-1 gap-2">
                  {loyaltyRewards.map(reward => (
                    <Button
                      key={reward.id}
                      variant={selectedReward === reward.id ? "default" : "outline"}
                      onClick={() => setSelectedReward(reward.id)}
                      className="justify-start h-auto p-3"
                    >
                      <div className="text-left">
                        <p className="font-medium">{reward.name}</p>
                        <p className="text-xs text-gray-500">{reward.description}</p>
                        <p className="text-xs font-bold text-purple-600">{reward.points} نقطة</p>
                      </div>
                    </Button>
                  ))}
                  
                  <Button
                    variant={selectedReward === "custom" ? "default" : "outline"}
                    onClick={() => setSelectedReward("custom")}
                    className="justify-start h-auto p-3"
                  >
                    <div className="text-left">
                      <p className="font-medium">نقاط مخصصة</p>
                      <p className="text-xs text-gray-500">حدد عدد النقاط يدوياً</p>
                    </div>
                  </Button>
                </div>
              </div>

              {selectedReward === "custom" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">عدد النقاط</label>
                  <Input
                    type="number"
                    value={customRewardPoints}
                    onChange={(e) => setCustomRewardPoints(Number(e.target.value))}
                    placeholder="أدخل عدد النقاط"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">سبب المكافأة</label>
                <Textarea
                  value={rewardReason}
                  onChange={(e) => setRewardReason(e.target.value)}
                  placeholder="اكتب سبب منح هذه المكافأة..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleRewardCustomers}
                  disabled={!selectedReward || !rewardReason.trim()}
                  className="flex-1"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  منح المكافأة ({selectedCustomersData.length})
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsRewardDialogOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {selectedCustomers.length === 0 ? (
          <div className="space-y-6">
            {/* إحصائيات برنامج الولاء */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <p className="font-bold text-lg">{loyaltyStats.totalCustomers}</p>
                <p className="text-sm text-gray-600">إجمالي العملاء</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Gift className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="font-bold text-lg">{loyaltyStats.customersWithPoints}</p>
                <p className="text-sm text-gray-600">عملاء لديهم نقاط</p>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="font-bold text-lg">{Math.round(loyaltyStats.averagePoints)}</p>
                <p className="text-sm text-gray-600">متوسط النقاط</p>
              </div>

              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Star className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                <p className="font-bold text-lg">
                  {Math.round((loyaltyStats.customersWithPoints / loyaltyStats.totalCustomers) * 100)}%
                </p>
                <p className="text-sm text-gray-600">معدل المشاركة</p>
              </div>
            </div>

            {/* أفضل عملاء الولاء */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                أفضل عملاء الولاء
              </h4>
              <div className="space-y-2">
                {loyaltyStats.topLoyalCustomers.map((customer, index) => {
                  const tier = getLoyaltyTier(customer.loyalty_points || 0);
                  const IconComponent = tier.icon;
                  return (
                    <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                          <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={tier.color}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {tier.name}
                        </Badge>
                        <span className="font-bold text-purple-600">
                          {customer.loyalty_points} نقطة
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              تم تحديد {selectedCustomers.length} عميل لإدارة نقاط الولاء
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedCustomersData.map(customer => {
                const tier = getLoyaltyTier(customer.loyalty_points || 0);
                const IconComponent = tier.icon;
                const nextTierPoints = customer.loyalty_points >= 5000 ? 0 : 
                  customer.loyalty_points >= 3000 ? 5000 - customer.loyalty_points :
                  customer.loyalty_points >= 1500 ? 3000 - customer.loyalty_points : 
                  1500 - customer.loyalty_points;
                
                return (
                  <div key={customer.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium truncate">{customer.name}</h5>
                      <Badge className={tier.color}>
                        <IconComponent className="h-3 w-3 mr-1" />
                        {tier.name}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>النقاط الحالية:</span>
                        <span className="font-bold">{customer.loyalty_points || 0}</span>
                      </div>
                      
                      {nextTierPoints > 0 && (
                        <>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>للمستوى التالي:</span>
                            <span>{nextTierPoints} نقطة</span>
                          </div>
                          <Progress 
                            value={((customer.loyalty_points || 0) / (customer.loyalty_points + nextTierPoints)) * 100} 
                            className="h-2" 
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerLoyaltyManager;
