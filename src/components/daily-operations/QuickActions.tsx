
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MessageSquare, Users } from "lucide-react";

const QuickActions = () => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>إجراءات سريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Button className="h-20 flex-col">
            <Plus className="h-6 w-6 mb-2" />
            عميل جديد
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <Calendar className="h-6 w-6 mb-2" />
            حجز جديد
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <MessageSquare className="h-6 w-6 mb-2" />
            رسالة جماعية
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <Users className="h-6 w-6 mb-2" />
            إدارة العملاء
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
