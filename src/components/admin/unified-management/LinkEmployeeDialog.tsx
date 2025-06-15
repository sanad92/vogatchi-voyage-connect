
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, Calendar, DollarSign } from 'lucide-react';

interface LinkEmployeeDialogProps {
  user: any;
  unlinkedEmployees: any[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (userId: string, employeeId: string) => void;
}

const LinkEmployeeDialog = ({ user, unlinkedEmployees, isOpen, onOpenChange, onLink }: LinkEmployeeDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = unlinkedEmployees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ربط {user.full_name} بموظف</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="البحث في الموظفين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Employees List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد موظفين متاحين</h3>
                <p className="text-gray-600">
                  جميع الموظفين مرتبطين بمستخدمين أو لا توجد موظفين يطابقون البحث
                </p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <Card key={employee.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{employee.full_name}</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>رقم الموظف: {employee.employee_code}</div>
                          <div>المنصب: {employee.position}</div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(employee.hire_date).toLocaleDateString('ar')}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {(employee.base_salary + employee.allowances).toLocaleString()} ج.م
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => onLink(user.id, employee.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ربط
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkEmployeeDialog;
