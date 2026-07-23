import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, GitBranch, Shield, Flag, Palette, ScrollText, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBranches, useDepartments } from '@/hooks/useBranchesDepartments';
import { useOrgMembers } from '@/hooks/useOrgMembers';

const sections = [
  { to: '/organization/branches', title: 'الفروع', icon: Building2, desc: 'إدارة فروع المؤسسة' },
  { to: '/organization/departments', title: 'الإدارات', icon: GitBranch, desc: 'إدارة الأقسام والإدارات' },
  { to: '/team', title: 'المستخدمون', icon: Users, desc: 'إدارة أعضاء الفريق' },
  { to: '/organization/feature-flags', title: 'الميزات', icon: Flag, desc: 'تفعيل/تعطيل الميزات' },
  { to: '/organization/white-label', title: 'الهوية البصرية', icon: Palette, desc: 'شعار وألوان المؤسسة' },
  { to: '/organization/security', title: 'مركز الأمان', icon: Shield, desc: 'MFA، PIN، سياسات كلمات المرور' },
  { to: '/audit-log', title: 'سجل التدقيق', icon: ScrollText, desc: 'كل العمليات الحساسة' },
  { to: '/admin-settings', title: 'الإعدادات العامة', icon: Key, desc: 'إعدادات المؤسسة الأساسية' },
];

export default function OrganizationCenter() {
  const { data: branches = [] } = useBranches();
  const { data: departments = [] } = useDepartments();
  const { members = [] } = useOrgMembers() as any;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">مركز المؤسسة</h1>
        <p className="text-muted-foreground text-sm mt-1">إعدادات ومكونات المؤسسة في مكان واحد</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="الفروع" value={branches.length} />
        <StatCard label="الإدارات" value={departments.length} />
        <StatCard label="المستخدمون" value={Array.isArray(members) ? members.length : 0} />
        <StatCard label="الفروع النشطة" value={branches.filter((b) => b.is_active).length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.to} to={s.to}>
              <Card className="hover:shadow-md hover:border-primary/40 transition cursor-pointer h-full">
                <CardContent className="p-5 space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
    <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
  </Card>
);
