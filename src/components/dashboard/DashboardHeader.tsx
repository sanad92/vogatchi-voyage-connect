const DashboardHeader = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {'\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0639\u0648\u062f\u062a\u0643! \ud83d\udc4b'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {'\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0623\u062f\u0627\u0621 \u0634\u0631\u0643\u062a\u0643 \u0627\u0644\u064a\u0648\u0645'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs sm:text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
