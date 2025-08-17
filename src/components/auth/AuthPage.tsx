import SupabaseAuthForm from '@/components/auth/SupabaseAuthForm';

const AuthPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <SupabaseAuthForm />
    </div>
  );
};

export default AuthPage;