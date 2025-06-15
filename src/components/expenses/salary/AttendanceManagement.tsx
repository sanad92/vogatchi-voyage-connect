
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Edit2 } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useAttendance } from '@/hooks/useAttendance';
import { toast } from 'sonner';

const AttendanceManagement = () => {
  const { employees } = useExpenses();
  const { attendanceRecords, attendanceLoading, addAttendanceRecord, isAddingAttendance } = useAttendance();
  
  const [newAttendance, setNewAttendance] = useState({
    employee_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '',
    check_out_time: '',
    status: 'present' as const,
    notes: ''
  });

  const handleAddAttendance = async () => {
    if (!newAttendance.employee_id || !newAttendance.attendance_date) {
      toast.error('يرجى إدخال الموظف والتاريخ');
      return;
    }

    try {
      // حساب الساعات الفعلية والإضافية
      let actualHours = 0;
      let overtimeHours = 0;
      
      if (newAttendance.check_in_time && newAttendance.check_out_time) {
        const checkIn = new Date(`${newAttendance.attendance_date}T${newAttendance.check_in_time}`);
        const checkOut = new Date(`${newAttendance.attendance_date}T${newAttendance.check_out_time}`);
        actualHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        
        // إذا كانت الساعات أكثر من 8، احسب الساعات الإضافية
        if (actualHours > 8) {
          overtimeHours = actualHours - 8;
        }
      }

      const attendanceData = {
        ...newAttendance,
        actual_hours: actualHours,
        overtime_hours: overtimeHours,
        late_minutes: 0, // يمكن حسابها لاحقاً
        early_leave_minutes: 0
      };

      await addAttendanceRecord(attendanceData);
      toast.success('تم إضافة سجل الحضور بنجاح');
      
      // إعادة تعيين النموذج
      setNewAttendance({
        employee_id: '',
        attendance_date: new Date().toISOString().split('T')[0],
        check_in_time: '',
        check_out_time: '',
        status: 'present',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding attendance:', error);
      toast.error('حدث خطأ في إضافة سجل الحضور');
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
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (attendanceLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            إضافة سجل حضور
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select 
                value={newAttendance.employee_id} 
                onValueChange={(value) => setNewAttendance(prev => ({ ...prev, employee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={newAttendance.attendance_date}
                onChange={(e) => setNewAttendance(prev => ({ ...prev, attendance_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select 
                value={newAttendance.status} 
                onValueChange={(value: any) => setNewAttendance(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">حاضر</SelectItem>
                  <SelectItem value="absent">غائب</SelectItem>
                  <SelectItem value="sick_leave">إجازة مرضية</SelectItem>
                  <SelectItem value="vacation">إجازة</SelectItem>
                  <SelectItem value="holiday">عطلة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>وقت الحضور</Label>
              <Input
                type="time"
                value={newAttendance.check_in_time}
                onChange={(e) => setNewAttendance(prev => ({ ...prev, check_in_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>وقت الانصراف</Label>
              <Input
                type="time"
                value={newAttendance.check_out_time}
                onChange={(e) => setNewAttendance(prev => ({ ...prev, check_out_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input
                value={newAttendance.notes}
                onChange={(e) => setNewAttendance(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات إضافية"
              />
            </div>
          </div>

          <Button 
            onClick={handleAddAttendance}
            className="mt-4"
            disabled={isAddingAttendance}
          >
            <Plus className="h-4 w-4 mr-2" />
            إضافة سجل الحضور
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            سجلات الحضور
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحضور</TableHead>
                <TableHead>الانصراف</TableHead>
                <TableHead>الساعات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords?.slice(0, 10).map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.employee?.full_name}
                  </TableCell>
                  <TableCell>
                    {new Date(record.attendance_date).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>{record.check_in_time || '-'}</TableCell>
                  <TableCell>{record.check_out_time || '-'}</TableCell>
                  <TableCell>
                    {record.actual_hours > 0 ? `${record.actual_hours.toFixed(1)} ساعة` : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>{record.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceManagement;
