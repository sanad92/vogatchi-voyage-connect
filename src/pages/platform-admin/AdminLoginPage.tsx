import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
export default function AdminLoginPage() {
 const {loading,isLoggedIn,signIn,signOut}=useOptimizedAuth();
 const {loading:roleLoading,isPlatformAdmin}=usePlatformAdmin();
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 if(loading||roleLoading) return <p>جارٍ التحقق...</p>;
 if(isLoggedIn() && isPlatformAdmin) return <Navigate to="/platform" replace/>;
 return <main dir="rtl" className="min-h-screen flex items-center justify-center p-6"><form className="space-y-4 w-full max-w-sm" onSubmit={async e=>{e.preventDefault();setError('');const result=await signIn(email,password);if(result.error)setError('تعذر تسجيل الدخول');}}>
 <h1 className="text-2xl font-bold">إدارة SafarERP</h1>
 {isLoggedIn() && !isPlatformAdmin ? <div role="alert"><p>هذا الحساب غير مصرح له بإدارة المنصة.</p><button type="button" onClick={()=>signOut()}>تسجيل الخروج</button></div> : null}
 {error&&<p role="alert">{error}</p>}
 <label className="block">البريد الإلكتروني<input className="block w-full border p-2" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label className="block">كلمة المرور<input className="block w-full border p-2" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <button type="submit" className="p-3 bg-primary text-primary-foreground rounded">دخول</button>
 </form></main>;
}
