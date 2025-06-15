
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

const CRMAutomation = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          أتمتة التسويق وسير العمل
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">أتمتة التسويق</h3>
          <p className="text-gray-600 mb-4">
            سيتم إضافة ميزات أتمتة التسويق وسير العمل في المرحلة التالية
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CRMAutomation;
