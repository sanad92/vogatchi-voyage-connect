
import { useState, useEffect } from "react";
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
  RefreshCw,
  UserCheck,
  Calendar
} from "lucide-react";
import { useEmployeeManagementData } from "@/hooks/useEmployeeManagementData";
import { toast } from "sonner";

interface DuplicateGroup {
  name?: string;
  phone?: string;
  email?: string;
  employees: Array<{
    id: string;
    full_name: string;
    employee_code: string;
    phone?: string;
    email?: string;
    position: string;
    department: string;
    hire_date: string;
    is_active: boolean;
    linkedToUser: boolean;
    userId?: string;
  }>;
  type: 'name' | 'phone' | 'email';
}

const DuplicateEmployeesManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const { allEmployees, refreshAllData } = useEmployeeManagementData();

  // تحليل البيانات للعثور على المكررات الحقيقية
  useEffect(() => {
    if (!allEmployees || allEmployees.length === 0) return;

    const nameGroups = new Map<string, any[]>();
    const phoneGroups = new Map<string, any[]>();
    const emailGroups = new Map<string, any[]>();

    // تجميع الموظفين حسب المعايير المختلفة
    allEmployees.forEach(employee => {
      // تجميع حسب الاسم (تطبيع الاسم)
      if (employee.full_name && employee.full_name.trim()) {
        const normalizedName = employee.full_name.toLowerCase().trim()
          .replace(/\s+/g, ' ') // توحيد المسافات
          .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - '٠'.charCodeAt(0) + '0'.charCodeAt(0))); // تحويل الأرقام العربية
        
        if (!nameGroups.has(normalizedName)) {
          nameGroups.set(normalizedName, []);
        }
        nameGroups.get(normalizedName)!.push(employee);
      }

      // تجميع حسب رقم الهاتف
      if (employee.phone && employee.phone.trim()) {
        const normalizedPhone = employee.phone.replace(/\D/g, ''); // إزالة كل شيء عدا الأرقام
        if (normalizedPhone.length >= 10) { // رقم هاتف صحيح
          if (!phoneGroups.has(normalizedPhone)) {
            phoneGroups.set(normalizedPhone, []);
          }
          phoneGroups.get(normalizedPhone)!.push(employee);
        }
      }

      // تجميع حسب البريد الإلكتروني
      if (employee.email && employee.email.trim()) {
        const normalizedEmail = employee.email.toLowerCase().trim();
        if (normalizedEmail.includes('@')) { // بريد إلكتروني صحيح
          if (!emailGroups.has(normalizedEmail)) {
            emailGroups.set(normalizedEmail, []);
          }
          emailGroups.get(normalizedEmail)!.push(employee);
        }
      }
    });

    const duplicates: DuplicateGroup[] = [];

    // إضافة المجموعات المكررة فقط
    nameGroups.forEach((employees, name) => {
      if (employees.length > 1) {
        // تحقق إضافي: تأكد من أنها ليست نفس الموظف برقم موظف مختلف
        const uniqueEmployeeIds = new Set(employees.map(emp => emp.id));
        if (uniqueEmployeeIds.size > 1) {
          duplicates.push({
            name,
            employees: employees.sort((a, b) => new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime()),
            type: 'name'
          });
        }
      }
    });

    phoneGroups.forEach((employees, phone) => {
      if (employees.length > 1) {
        const uniqueEmployeeIds = new Set(employees.map(emp => emp.id));
        if (uniqueEmployeeIds.size > 1) {
          duplicates.push({
            phone,
            employees: employees.sort((a, b) => new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime()),
            type: 'phone'
          });
        }
      }
    });

    emailGroups.forEach((employees, email) => {
      if (employees.length > 1) {
        const uniqueEmployeeIds = new Set(employees.map(emp => emp.id));
        if (uniqueEmployeeIds.size > 1) {
          duplicates.push({
            email,
            employees: employees.sort((a, b) => new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime()),
            type: 'email'
          });
        }
      }
    });

    console.log('🔍 تحليل التكرار:', {
      totalEmployees: allEmployees.length,
      nameGroups: nameGroups.size,
      phoneGroups: phoneGroups.size,
      emailGroups: emailGroups.size,
      duplicatesFound: duplicates.length
    });

    setDuplicateGroups(duplicates);
  }, [allEmployees]);

  const filteredGroups = duplicateGroups.filter(group => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return group.employees.some(employee => 
      employee.full_name.toLowerCase().includes(searchLower) ||
      employee.employee_code.toLowerCase().includes(searchLower) ||
      employee.position.toLowerCase().includes(searchLower) ||
      employee.department.toLowerCase().includes(searchLower)
    );
  });

  const handleMergeEmployees = async (group: DuplicateGroup) => {
    // سنقوم بتنفيذ عملية الدمج لاحقاً
    toast.info('ميزة الدمج قيد التطوير - يرجى التواصل مع المطور');
  };

  const handleRefresh = async () => {
    try {
      await refreshAllData();
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error('خطأ في تحديث البيانات:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-600" />
            إدارة الموظفين المكررين المحسنة
          </h2>
          <p className="text-gray-600 mt-1">
            عثرنا على {duplicateGroups.length} مجموعة من الموظفين المحتمل تكرارها حقيقياً
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          إعادة تحليل
        </Button>
      </div>

      {duplicateGroups.length === 0 ? (
        <Alert className="border-green-200 bg-green-50">
          <AlertTriangle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ممتاز! لا توجد موظفين مكررين في النظام بعد الإصلاح.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="ابحث في الموظفين المكررين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4">
            {filteredGroups.map((group, index) => (
              <Card key={index} className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      {group.type === 'name' && <Users className="h-5 w-5 text-orange-600" />}
                      {group.type === 'phone' && <Phone className="h-5 w-5 text-orange-600" />}
                      {group.type === 'email' && <Mail className="h-5 w-5 text-orange-600" />}
                      <span>
                        تكرار في {group.type === 'name' ? 'الاسم' : group.type === 'phone' ? 'رقم الهاتف' : 'البريد الإلكتروني'}
                      </span>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        {group.employees.length} موظفين
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-700 border-blue-300"
                      onClick={() => handleMergeEmployees(group)}
                    >
                      <Merge className="h-4 w-4 mr-1" />
                      دمج الموظفين
                    </Button>
                  </CardTitle>
                  {group.name && (
                    <p className="text-sm text-orange-700">الاسم: {group.name}</p>
                  )}
                  {group.phone && (
                    <p className="text-sm text-orange-700">رقم الهاتف: {group.phone}</p>
                  )}
                  {group.email && (
                    <p className="text-sm text-orange-700">البريد الإلكتروني: {group.email}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {group.employees.map((employee, employeeIndex) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{employee.full_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {employee.employee_code}
                            </Badge>
                            {!employee.is_active && (
                              <Badge variant="destructive" className="text-xs">
                                معطل
                              </Badge>
                            )}
                            {employee.linkedToUser && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                مرتبط بمستخدم
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-4">
                              <span>{employee.position} - {employee.department}</span>
                            </div>
                            {employee.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {employee.phone}
                              </div>
                            )}
                            {employee.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {employee.email}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              تاريخ التوظيف: {new Date(employee.hire_date).toLocaleDateString('ar-EG')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {employeeIndex === 0 && (
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              الأقدم
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm">
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

      {/* معلومات تطوير */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">
              [تطوير] إجمالي الموظفين: {allEmployees.length} | 
              مجموعات مكررة: {duplicateGroups.length} |
              <span className="text-green-700">✓ تم إصلاح منطق منع التكرار</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateEmployeesManager;
