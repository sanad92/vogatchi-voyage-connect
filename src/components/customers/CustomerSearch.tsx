
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, User, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

const CustomerSearch = ({ onCustomerSelect, onNewCustomer, selectedCustomer }: CustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, nationality')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('name')
        .limit(10);
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: searchTerm.length >= 2
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setIsSearching(value.length >= 2);
  };

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchTerm(customer.name);
    setIsSearching(false);
  };

  useEffect(() => {
    if (selectedCustomer) {
      setSearchTerm(selectedCustomer.name);
    }
  }, [selectedCustomer]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="ابحث عن عميل بالاسم أو الهاتف أو البريد الإلكتروني..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {selectedCustomer && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{selectedCustomer.name}</p>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Phone className="h-3 w-3" />
                    <span>{selectedCustomer.phone}</span>
                    {selectedCustomer.email && (
                      <>
                        <Mail className="h-3 w-3 ml-2" />
                        <span>{selectedCustomer.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {selectedCustomer.nationality && (
                <Badge variant="secondary">{selectedCustomer.nationality}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isSearching && (
        <Card className="border shadow-lg">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">جاري البحث...</div>
            ) : customers && customers.length > 0 ? (
              <div className="space-y-1">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="p-3 hover:bg-gray-50 cursor-pointer rounded-md border-b last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                          {customer.email && (
                            <>
                              <Mail className="h-3 w-3 ml-2" />
                              <span>{customer.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {customer.nationality && (
                        <Badge variant="outline">{customer.nationality}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-500 mb-2">لا توجد نتائج للبحث</p>
                <Button onClick={onNewCustomer} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عميل جديد
                </Button>
              </div>
            )}
            
            {!isLoading && (
              <div className="border-t pt-2 mt-2">
                <Button onClick={onNewCustomer} variant="ghost" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عميل جديد
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
