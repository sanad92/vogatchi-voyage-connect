
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Phone, 
  Mail, 
  Search, 
  Eye, 
  Merge, 
  AlertTriangle,
  RefreshCw 
} from "lucide-react";


interface DuplicateGroup {
  phone?: string;
  email?: string;
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    created_at: string;
  }>;
  type: 'phone' | 'email';
}

const DuplicateCustomersManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  

  const { data: rpcGroups, isLoading, refetch } = useQuery({
    queryKey: ['duplicate-customers', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_duplicate_customers', {
        p_search: searchTerm || null,
        p_type: null,
        p_min_count: 2,
        p_limit: 500,
        p_offset: 0
      });
      if (error) throw error;
      return data;
    }
  });

  // استخدام نتائج RPC لتحويلها إلى مجموعات مكررة
  useEffect(() => {
    if (!rpcGroups) return;

    const mapped: DuplicateGroup[] = rpcGroups.map((row: any) => ({
      type: row.group_type === 'phone' ? 'phone' : 'email',
      phone: row.group_type === 'phone' ? row.key : undefined,
      email: row.group_type === 'email' ? row.key : undefined,
      customers: (row.customers || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        created_at: c.created_at
      }))
    }));

    setDuplicateGroups(mapped);
  }, [rpcGroups]);

  const filteredGroups = duplicateGroups.filter(group => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return group.customers.some(customer => 
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-2">جاري تحليل البيانات للعثور على المكررات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-600" />
            إدارة العملاء المكررين
          </h2>
          <p className="text-gray-600 mt-1">
            عثرنا على {duplicateGroups.length} مجموعة من العملاء المحتمل تكرارها
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          إعادة تحليل
        </Button>
      </div>

      {duplicateGroups.length === 0 ? (
        <Alert className="border-green-200 bg-green-50">
          <AlertTriangle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ممتاز! لا توجد عملاء مكررين في النظام.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="ابحث في العملاء المكررين..."
              aria-label="بحث عن العملاء المكررين"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4">
            {filteredGroups.map((group, index) => (
              <Card key={index} className="border-orange-200 bg-orange-50 animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      {group.type === 'phone' ? (
                        <Phone className="h-5 w-5 text-orange-600" />
                      ) : (
                        <Mail className="h-5 w-5 text-orange-600" />
                      )}
                      <span>
                        تكرار في {group.type === 'phone' ? 'رقم الهاتف' : 'البريد الإلكتروني'}
                      </span>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        {group.customers.length} عملاء
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
                      <Merge className="h-4 w-4 mr-1" />
                      دمج العملاء
                    </Button>
                  </CardTitle>
                  {group.phone && (
                    <p className="text-sm text-orange-700">رقم الهاتف: {group.phone}</p>
                  )}
                  {group.email && (
                    <p className="text-sm text-orange-700">البريد الإلكتروني: {group.email}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {group.customers.map((customer, customerIndex) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              أُضيف في: {new Date(customer.created_at).toLocaleDateString('ar-EG')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {customerIndex === 0 && (
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              الأقدم
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm" aria-label={`عرض العميل ${customer.name}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DuplicateCustomersManager;
