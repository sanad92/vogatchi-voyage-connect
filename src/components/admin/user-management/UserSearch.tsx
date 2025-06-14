
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UserSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const UserSearch = ({ searchTerm, onSearchChange }: UserSearchProps) => {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        placeholder="البحث عن مستخدم..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pr-10"
      />
    </div>
  );
};

export default UserSearch;
