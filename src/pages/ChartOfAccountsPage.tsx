import { useState, useMemo } from 'react';
import { useChartOfAccounts, type AccountType } from '@/hooks/useChartOfAccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, BookOpen, Search } from 'lucide-react';

const TYPE_LABELS: Record<AccountType, { ar: string; color: string }> = {
  asset: { ar: 'أصول', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  liability: { ar: 'خصوم', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  equity: { ar: 'حقوق ملكية', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  revenue: { ar: 'إيرادات', color: 'bg-green-500/10 text-green-700 dark:text-green-300' },
  expense: { ar: 'مصروفات', color: 'bg-red-500/10 text-red-700 dark:text-red-300' },
};

export default function ChartOfAccountsPage() {
  const { accounts, isLoading, createAccount } = useChartOfAccounts();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    account_code: '',
    account_name: '',
    account_name_ar: '',
    account_type: 'asset' as AccountType,
  });

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      const matchSearch = !search || 
        a.account_code.includes(search) ||
        a.account_name.toLowerCase().includes(search.toLowerCase()) ||
        (a.account_name_ar || '').includes(search);
      const matchType = filterType === 'all' || a.account_type === filterType;
      return matchSearch && matchType;
    });
  }, [accounts, search, filterType]);

  const handleCreate = async () => {
    if (!form.account_code || !form.account_name) return;
    await createAccount.mutateAsync(form);
    setOpen(false);
    setForm({ account_code: '', account_name: '', account_name_ar: '', account_type: 'asset' });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            شجرة الحسابات
          </h1>
          <p className="text-muted-foreground mt-1">دليل الحسابات المحاسبية للمؤسسة</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />إضافة حساب</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة حساب جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>كود الحساب</Label>
                <Input value={form.account_code} onChange={(e) => setForm({ ...form, account_code: e.target.value })} placeholder="مثال: 1500" />
              </div>
              <div>
                <Label>اسم الحساب (انجليزي)</Label>
                <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
              </div>
              <div>
                <Label>اسم الحساب (عربي)</Label>
                <Input value={form.account_name_ar} onChange={(e) => setForm({ ...form, account_name_ar: e.target.value })} />
              </div>
              <div>
                <Label>نوع الحساب</Label>
                <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v as AccountType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={createAccount.isPending} className="w-full">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">جارٍ التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>النظام</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono">{a.account_code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{a.account_name_ar || a.account_name}</div>
                      {a.account_name_ar && <div className="text-xs text-muted-foreground">{a.account_name}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge className={TYPE_LABELS[a.account_type].color}>{TYPE_LABELS[a.account_type].ar}</Badge>
                    </TableCell>
                    <TableCell>{a.is_system && <Badge variant="outline">افتراضي</Badge>}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">لا توجد حسابات</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
