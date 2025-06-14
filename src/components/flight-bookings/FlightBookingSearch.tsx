
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";

interface FlightBookingSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateNew: () => void;
}

const FlightBookingSearch = ({ 
  searchTerm, 
  onSearchChange, 
  onCreateNew 
}: FlightBookingSearchProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="البحث في حجوزات الطيران..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button onClick={onCreateNew} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        حجز طيران جديد
      </Button>
    </div>
  );
};

export default FlightBookingSearch;
