import VogantraLogo from '@/components/brand/VogantraLogo';

const AuthHeader = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-4">
        <VogantraLogo size="xl" />
      </div>
      <p className="text-muted-foreground mt-2">ERP السياحة الذكي</p>
    </div>
  );
};

export default AuthHeader;
