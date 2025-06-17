
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Settings } from 'lucide-react';
import { useCRM } from '@/hooks/useCRM';
import { useCustomers } from '@/hooks/useCustomers';
import { toast } from 'sonner';

const CustomerSegments = () => {
  const { customerSegments, createCampaign } = useCRM();
  const { customers } = useCustomers();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSegment, setNewSegment] = useState({
    name: '',
    name_ar: '',
    description: '',
    color: '#3b82f6',
    minimum_bookings: 0,
    minimum_total_spent: 0
  });

  const getCustomersInSegment = (segmentId: string) => {
    if (!customers) return [];
    return customers.filter(customer => {
      if (customer.segment_id === segmentId) return true;
      
      // تطبيق قواعد التقسيم التلقائي
      const segment = customerSegments?.find(s => s.id === segmentId);
      if (!segment) return false;
      
      const totalBookings = customer.total_bookings || 0;
      const totalSpent = customer.total_spent || 0;
      
      return totalBookings >= segment.minimum_bookings && 
             totalSpent >= segment.minimum_total_spent;
    });
  };

  const handleCreateSegment = () => {
    // هنا يمكن إضافة API call لإنشاء segment جديد
    console.log('Creating segment:', newSegment);
    toast.success('تم إنشاء الشريحة بنجاح');
    setIsCreateDialogOpen(false);
    setNewSegment({
      name: '',
      name_ar: '',
      description: '',
      color: '#3b82f6',
      minimum_bookings: 0,
      minimum_total_spent: 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">شرائح العملاء</h2>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              إنشاء شريحة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء شريحة عملاء جديدة</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">الاسم (إنجليزي)</Label>
                  <Input
                    id="name"
                    value={newSegment.name}
                    onChange={(e) => setNewSegment({...newSegment, name: e.target.value})}
                    placeholder="VIP Customers"
                  />
                </div>
                <div>
                  <Label htmlFor="name_ar">الاسم (عربي)</Label>
                  <Input
                    id="name_ar"
                    value={newSegment.name_ar}
                    onChange={(e) => setNewSegment({...newSegment, name_ar: e.target.value})}
                    placeholder="عملاء VIP"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={newSegment.description}
                  onChange={(e) => setNewSegment({...newSegment, description: e.target.value})}
                  placeholder="وصف الشريحة..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_bookings">الحد الأدنى للحجوزات</Label>
                  <Input
                    id="min_bookings"
                    type="number"
                    value={newSegment.minimum_bookings}
                    onChange={(e) => setNewSegment({...newSegment, minimum_bookings: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="min_spent">الحد الأدنى للإنفاق</Label>
                  <Input
                    id="min_spent"
                    type="number"
                    value={newSegment.minimum_total_spent}
                    onChange={(e) => setNewSegment({...newSegment, minimum_total_spent: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="color">اللون</Label>
                <Input
                  id="color"
                  type="color"
                  value={newSegment.color}
                  onChange={(e) => setNewSegment({...newSegment, color: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleCreateSegment}>
                  إنشاء الشريحة
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customerSegments?.map((segment) => {
          const customersInSegment = getCustomersInSegment(segment.id);
          
          return (
            <Card key={segment.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: segment.color }}
                    />
                    {segment.name_ar}
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{segment.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>العملاء في الشريحة:</span>
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {customersInSegment.length}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <div>الحد الأدنى للحجوزات: {segment.minimum_bookings}</div>
                    <div>الحد الأدنى للإنفاق: {segment.minimum_total_spent.toLocaleString()} ج.م</div>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  عرض العملاء
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerSegments;
