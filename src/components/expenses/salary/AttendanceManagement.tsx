
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Calendar, Users } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { toast } from 'sonner';

const AttendanceManagement = () => {
  const { attendanceRecords, attendanceLoading, addAttendanceRecord, isAddingAttendance } = useAttendance();
  const { employees, employeesLoading } = useEmployees();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const handleMarkAttendance = async (employeeId: string, status: string) => {
    try {
      await addAttendanceRecord({
        employee_id: employeeId,
        attendance_date: selectedDate,
        check_in_time: status === 'present' ? '09:00' : null,
        check_out_time: status === 'present' ? '17:00' : null,
        actual_hours: status === 'present' ? 8 : 0,
        overtime_hours: 0,
        late_minutes: 0,
        early_leave_minutes: 0,
        status: status as any,
        notes: null
      });
      toast.success('تم تسجيل الحضور بنجاح');
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('حدث خطأ في تسجيل الحضور');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { label: 'حاضر', variant: 'default' as const },
      absent: { label: 'غائب', variant: 'destructive' as const },
      sick_leave: { label: 'إجازة مرضية', variant: 'secondary' as const },
      vacation: { label: 'إجازة', variant: 'outline' as const },
      holiday: { label: 'عطلة', variant: 'secondary' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.absent;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (attendanceLoading || employeesLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">إجمالي الموظفين</p>
                <p className="text-2xl font-bold">{employees?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">الحاضرون اليوم</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">الغائبون اليوم</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">متوسط ساعات العمل</p>
                <p className="text-2xl font-bold">8</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تسجيل الحضور اليومي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            تسجيل الحضور اليومي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>التاريخ</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>المنصب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>العمليات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.full_name}</TableCell>
                  <TableCell>{employee.department || 'غير محدد'}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    {getStatusBadge('present')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleMarkAttendance(employee.id, 'present')}
                        disabled={isAddingAttendance}
                      >
                        حاضر
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleMarkAttendance(employee.id, 'absent')}
                        disabled={isAddingAttendance}
                      >
                        غائب
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* سجل الحضور */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الحضور والانصراف</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>وقت الدخول</TableHead>
                <TableHead>وقت الخروج</TableHead>
                <TableHead>عدد الساعات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    لا توجد سجلات حضور متاحة
                  </TableCell>
                </TableRow>
              ) : (
                attendanceRecords?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {employees?.find(emp => emp.id === record.employee_id)?.full_name || 'غير محدد'}
                    </TableCell>
                    <TableCell>{new Date(record.attendance_date).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{record.check_in_time || '--'}</TableCell>
                    <TableCell>{record.check_out_time || '--'}</TableCell>
                    <TableCell>{record.actual_hours || 0} ساعة</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{record.notes || '--'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceManagement;
