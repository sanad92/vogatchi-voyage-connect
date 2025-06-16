
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, User, Phone, Mail, UserPlus, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/useDebounce";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
}

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer) => void;
  onNewCustomer: () => void;
  selectedCustomer?: Customer | null;
}

const RESULTS_PER_PAGE = 10;
const MAX_VISIBLE_RESULTS = 5;

const CustomerSearch = ({ onCustomerSelect, onNewCustomer, selectedCustomer }: CustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  
  // استخدام debounce لتحسين الأداء
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: allCustomers, isLoading } = useQuery({
    queryKey: ['customers-search', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, nationality')
        .or(`name.ilike.%${debouncedSearchTerm}%,phone.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%`)
        .order('name')
        .limit(50); // حد أقصى من الخادم
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: debouncedSearchTerm.length >= 2
  });

  // تحديد النتائج المعروضة
  const displayedCustomers = showAllResults 
    ? allCustomers || []
    : (allCustomers || []).slice(0, MAX_VISIBLE_RESULTS);
  
  const hasMoreResults = (allCustomers?.length || 0) > MAX_VISIBLE_RESULTS;
  const totalResults = allCustomers?.length || 0;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setIsSearching(value.length >= 2);
    setShowAllResults(false); // إعادة تعيين عند البحث الجديد
  };

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchTerm(customer.name);
    setIsSearching(false);
    setShowAllResults(false);
  };

  const handleShowMore = () => {
    setShowAllResults(true);
  };

  useEffect(() => {
    if (selectedCustomer) {
      setSearchTerm(selectedCustomer.name);
      setIsSearching(false);
    }
  }, [selectedCustomer]);

  return (
    <div className="space-y-3">
      {!selectedCustomer && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="ابحث بالاسم أو رقم الهاتف أو البريد الإلكتروني (اكتب حرفين على الأقل)..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={onNewCustomer} 
              variant="outline" 
              className="flex-1 bg-green-50 border-green-200 hover:bg-green-100"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              إضافة عميل جديد
            </Button>
          </div>
        </>
      )}

      {selectedCustomer && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{selectedCustomer.name}</p>
                  <div className="flex items-center gap-3 text-sm text-green-600">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedCustomer.nationality && (
                  <Badge variant="secondary">{selectedCustomer.nationality}</Badge>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    onCustomerSelect(null as any);
                    setSearchTerm("");
                    setShowAllResults(false);
                  }}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  تغيير
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isSearching && !selectedCustomer && (
        <Card className="border shadow-lg">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
                جاري البحث...
              </div>
            ) : displayedCustomers.length > 0 ? (
              <div className="space-y-1">
                {/* عرض عدد النتائج */}
                <div className="px-3 py-2 bg-gray-50 text-sm text-gray-600 border-b">
                  <div className="flex items-center justify-between">
                    <span>
                      عرض {displayedCustomers.length} من أصل {totalResults} نتيجة
                    </span>
                    {!showAllResults && hasMoreResults && (
                      <span className="text-blue-600 text-xs">
                        +{totalResults - MAX_VISIBLE_RESULTS} نتيجة أخرى
                      </span>
                    )}
                  </div>
                </div>

                {/* قائمة النتائج مع حد أقصى للارتفاع */}
                <div className="max-h-80 overflow-y-auto">
                  {displayedCustomers.map((customer, index) => (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-6">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{customer.phone}</span>
                              </div>
                              {customer.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{customer.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {customer.nationality && (
                          <Badge variant="outline" className="text-xs">
                            {customer.nationality}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* زر عرض المزيد */}
                {!showAllResults && hasMoreResults && (
                  <div className="p-2 border-t bg-gray-50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShowMore}
                      className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      عرض {totalResults - MAX_VISIBLE_RESULTS} نتيجة أخرى
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center">
                <div className="text-gray-500 mb-3">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>لا توجد نتائج للبحث "{debouncedSearchTerm}"</p>
                </div>
                <Button 
                  onClick={onNewCustomer} 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-green-50 border-green-200 hover:bg-green-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة "{debouncedSearchTerm}" كعميل جديد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSearch;
