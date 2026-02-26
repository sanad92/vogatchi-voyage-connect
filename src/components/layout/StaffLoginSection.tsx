import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const StaffLoginSection = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">منطقة الموظفين</h2>
          <p className="text-muted-foreground mb-8">
            للموظفين والمدراء: يمكنكم الوصول إلى لوحة التحكم الخاصة بإدارة الحجوزات والعملاء
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">إدارة العملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  متابعة العملاء وطلباتهم وتحديث حالة الحجوزات
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">إدارة الحجوزات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  تسجيل وتتبع جميع حجوزات الفنادق والطيران والسيارات
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <Settings className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">التقارير والإحصائيات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  مراجعة التقارير المالية وإحصائيات الأداء
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
            <h3 className="text-xl font-semibold mb-2">دخول النظام الإداري</h3>
            <p className="text-muted-foreground mb-4">
              استخدم بيانات الدخول الخاصة بك للوصول إلى لوحة التحكم
            </p>
            <Button size="lg" asChild>
              <Link to="/login">
                <Shield className="h-5 w-5 mr-2" />
                تسجيل الدخول
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StaffLoginSection;