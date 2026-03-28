import { useState } from 'react';
import { useAuditLog, getChangedFields, type AuditLogEntry } from '@/hooks/useAuditLog';
import { useClientPagination } from '@/hooks/useClientPagination';
import PaginationControlsUI from '@/components/ui/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Eye, Clock, User, Database, Shield, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AuditLogViewerProps {
  targetTable?: string;
  targetId?: string;
  title?: string;
  compact?: boolean;
  showFilters?: boolean;
}

const ACTION_MAP: Record<string, { label: string; color: string }> = {
  INSERT: { label: 'إنشاء', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  UPDATE: { label: 'تعديل', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  DELETE: { label: 'حذف', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const TABLE_MAP: Record<string, string> = {
  hotel_bookings: 'حجوزات الفنادق',
  flight_bookings: 'حجوزات الطيران',
  car_rentals: 'تأجير السيارات',
  transport_bookings: 'حجوزات النقل',
  customers: 'العملاء',
  invoices: 'الفواتير',
  suppliers: 'الموردين',
  employees: 'الموظفين',
  quotes: 'عروض الأسعار',
};

const AuditLogViewer = ({ targetTable, targetId, title, compact = false, showFilters = true }: AuditLogViewerProps) => {
  const [action, setAction] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const { data: logs, isLoading } = useAuditLog({
    targetTable,
    targetId,
    action: action !== 'all' ? action : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: compact ? 20 : 500,
  });

  const filtered = (logs || []).filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.entity_name?.toLowerCase().includes(s) ||
      log.target_table?.toLowerCase().includes(s) ||
      log.action?.toLowerCase().includes(s) ||
      log.user_email?.toLowerCase().includes(s)
    );
  });

  const { paginatedItems, pagination } = useClientPagination(filtered, compact ? 20 : 50);

  const changedFields = selected ? getChangedFields(selected.old_values, selected.new_values) : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          {title || 'سجل العمليات'}
          <Badge variant="outline" className="text-xs mr-auto">{filtered.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 h-9 text-sm" />
            </div>
            {!targetTable && (
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="INSERT">إنشاء</SelectItem>
                  <SelectItem value="UPDATE">تعديل</SelectItem>
                  <SelectItem value="DELETE">حذف</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-9 text-sm" placeholder="من" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-9 text-sm" placeholder="إلى" />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">لا توجد سجلات</div>
        ) : (
          <ScrollArea className={compact ? 'max-h-[400px]' : 'max-h-[600px]'}>
            <div className="space-y-2">
              {paginatedItems.map(log => {
                const actionInfo = ACTION_MAP[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' };
                const tableLabel = TABLE_MAP[log.target_table || ''] || log.target_table || '';
                const changed = getChangedFields(log.old_values, log.new_values);

                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${actionInfo.color}`}>{actionInfo.label}</Badge>
                        {!targetTable && <Badge variant="outline" className="text-xs">{tableLabel}</Badge>}
                        {log.entity_name && (
                          <span className="text-sm font-medium text-foreground truncate">{log.entity_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </span>
                        {log.user_email && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.user_email}
                          </span>
                        )}
                        {log.action === 'UPDATE' && changed.length > 0 && (
                          <span className="text-primary">{changed.length} حقل متغير</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelected(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          {!compact && <PaginationControlsUI pagination={pagination} />}
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                تفاصيل العملية
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <InfoBox label="العملية" value={ACTION_MAP[selected.action]?.label || selected.action} />
                  <InfoBox label="الجدول" value={TABLE_MAP[selected.target_table || ''] || selected.target_table || '-'} />
                  <InfoBox label="التاريخ" value={format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm:ss')} />
                  <InfoBox label="المستخدم" value={selected.user_email || selected.user_id?.slice(0, 8) || 'غير محدد'} />
                </div>

                {selected.entity_name && (
                  <InfoBox label="العنصر" value={selected.entity_name} />
                )}

                {/* Changed fields for UPDATE */}
                {selected.action === 'UPDATE' && changedFields.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground">الحقول المتغيرة</h4>
                    <div className="space-y-2">
                      {changedFields.map(field => (
                        <div key={field} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30 text-sm">
                          <span className="font-medium text-foreground min-w-[120px]">{field}</span>
                          <span className="text-destructive line-through truncate max-w-[200px]">
                            {formatValue(selected.old_values?.[field])}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-primary truncate max-w-[200px]">
                            {formatValue(selected.new_values?.[field])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full data for INSERT */}
                {selected.action === 'INSERT' && selected.new_values && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground">البيانات المُدخلة</h4>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-[300px] text-foreground">
                      {JSON.stringify(selected.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Full data for DELETE */}
                {selected.action === 'DELETE' && selected.old_values && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground">البيانات المحذوفة</h4>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-[300px] text-destructive/80">
                      {JSON.stringify(selected.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.details && Object.keys(selected.details).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground">تفاصيل إضافية</h4>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-[200px] text-foreground">
                      {JSON.stringify(selected.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return 'فارغ';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export default AuditLogViewer;
