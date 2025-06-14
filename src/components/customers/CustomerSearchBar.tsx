
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import CustomerSearch from "./CustomerSearch";

interface CustomerSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onCustomerSelect: (customer: any) => void;
  onNewCustomer: () => void;
}

const CustomerSearchBar = ({ 
  searchTerm, 
  onSearchChange, 
  onCustomerSelect, 
  onNewCustomer 
}: CustomerSearchBarProps) => {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ابحث عن عميل باسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <CustomerSearch 
        onCustomerSelect={onCustomerSelect}
        onNewCustomer={onNewCustomer}
      />
    </div>
  );
};

export default CustomerSearchBar;
