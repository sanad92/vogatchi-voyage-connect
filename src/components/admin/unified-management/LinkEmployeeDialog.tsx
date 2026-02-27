
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink } from 'lucide-react';
import EmployeeSearchBar from './link-dialog/EmployeeSearchBar';
import EmployeesList from './link-dialog/EmployeesList';

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

  const handleLinkEmployee = (employeeId: string) => {
    onLink(user.id, employeeId);
  };

  const handleGoToEmployeesPage = () => {
    window.open('/employees-enhanced', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ربط {user.full_name} بموظف</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <EmployeeSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          {filteredEmployees.length === 0 && !searchTerm && (
            <div className="text-center py-8 space-y-4">
              <div className="text-gray-500">
                لا توجد موظفين متاحين للربط
              </div>
              <Button 
                onClick={handleGoToEmployeesPage}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                إضافة موظف جديد
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}

          {filteredEmployees.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              لا توجد نتائج مطابقة للبحث
            </div>
          )}

          {filteredEmployees.length > 0 && (
            <EmployeesList
              employees={filteredEmployees}
              onLinkEmployee={handleLinkEmployee}
            />
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={handleGoToEmployeesPage}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            إدارة الموظفين
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkEmployeeDialog;
