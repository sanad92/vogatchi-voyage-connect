
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface EmployeeFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const EmployeeFilters = ({ searchTerm, onSearchChange }: EmployeeFiltersProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="البحث في الموظفين..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeFilters;
