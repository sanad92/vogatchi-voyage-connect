import { Link } from 'react-router-dom';
import { Building2, LogOut } from 'lucide-react';

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const OrganizationSetupNotice = () => {
  const { signOut, loading } = useOptimizedAuth();

  return (
    <Alert className="border-amber-300/80 bg-amber-50 text-right dark:border-amber-700/70 dark:bg-amber-950/20">
      <Building2 className="h-4 w-4 text-amber-700 dark:text-amber-300" />
      <AlertDescription className="space-y-4 text-amber-900 dark:text-amber-200">
        <div className="space-y-1">
          <AlertTitle className="text-base font-semibold">أنت مسجل الدخول بالفعل</AlertTitle>
          <p>
            الحساب الحالي ليس مرتبطًا بأي مؤسسة حتى الآن. أكمل إنشاء المؤسسة أولًا أو
            سجّل الخروج للدخول بحساب مختلف.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/create-organization">
            <Button type="button" size="sm" variant="secondary">
              إكمال إنشاء المؤسسة
            </Button>
          </Link>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => signOut()}
            disabled={loading}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default OrganizationSetupNotice;
