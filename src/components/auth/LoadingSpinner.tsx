
const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
