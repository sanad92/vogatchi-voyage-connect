
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

          <EmployeesList
            employees={filteredEmployees}
            onLinkEmployee={handleLinkEmployee}
          />
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
