
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

interface SupplierSearchAndAddProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
}

const SupplierSearchAndAdd = ({ searchTerm, onSearchChange, onAddClick }: SupplierSearchAndAddProps) => {
  return (
    <div className="flex justify-between items-center gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="البحث في الموردين..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button onClick={onAddClick}>
        <Plus className="w-4 h-4 ml-2" />
        إضافة مورد جديد
      </Button>
    </div>
  );
};

export default SupplierSearchAndAdd;
