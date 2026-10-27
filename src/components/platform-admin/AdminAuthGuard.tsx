import { Navigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
export default function AdminAuthGuard({children}:{children:React.ReactNode}) {
 const {loading,isLoggedIn}=useOptimizedAuth();
 if(loading) return <p>جارٍ التحقق...</p>;
 return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}
