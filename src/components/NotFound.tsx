
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">404</CardTitle>
          <p className="text-xl text-gray-600 mt-2">الصفحة غير موجودة</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-500">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى مكان آخر.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="flex items-center gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                العودة للرئيسية
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              الصفحة السابقة
            </Button>
          </div>
          <div className="text-xs text-gray-400 mt-4">
            المسار المطلوب: {location.pathname}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
