
import Navbar from "@/components/Navbar";
import { MessageCircle } from "lucide-react";

const WhatsApp = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-[#25d366] flex items-center gap-2">
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" /> محادثات الواتساب
        </h2>
        
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8 text-center">
          <p className="text-base sm:text-lg text-gray-600 mb-4">
            هذه الصفحة مخصصة لعرض ودمج محادثات الواتساب (WhatsApp Cloud API) مع العملاء.
          </p>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            لتنفيذ الربط الفعلي يجب تفعيل WhatsApp Business Cloud API <br className="hidden sm:block" />
            ورابط Endpoint من حسابك على Meta وربطه بالداتا هنا. <br className="hidden sm:block" />
            يمكنك معرفة المزيد من خلال{" "}
            <a 
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/" 
              className="text-blue-600 underline hover:text-blue-800 transition" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              التوثيق الرسمي من Meta
            </a>
          </p>
          
          <div className="mt-6 sm:mt-8 text-xs sm:text-sm bg-green-50 p-3 sm:p-4 rounded-lg">
            <span role="img" aria-label="info" className="text-base sm:text-lg">ℹ️</span> 
            <span className="font-semibold ml-2">هذه مجرد تجربة عرض إلى حين توفير الربط الفعلي عبر API.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsApp;
