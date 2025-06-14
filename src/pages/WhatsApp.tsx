
import Navbar from "@/components/Navbar";
import { MessageCircle } from "lucide-react";

const WhatsApp = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar />
      <div className="container py-8">
        <h2 className="text-2xl font-bold mb-6 text-[#25d366] flex items-center gap-2">
          <MessageCircle /> محادثات الواتساب
        </h2>
        <div className="bg-white rounded-lg shadow p-6 mb-8 text-center">
          <p className="text-lg text-gray-600 mb-2">هذه الصفحة مخصصة لعرض ودمج محادثات الواتساب (WhatsApp Cloud API) مع العملاء.</p>
          <p className="text-sm text-gray-700">
            لتنفيذ الربط الفعلي يجب تفعيل WhatsApp Business Cloud API <br />
            ورابط Endpoint من حسابك على Meta وربطه بالداتا هنا. <br />
            يمكنك معرفة المزيد من خلال{" "}
            <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              التوثيق الرسمي من Meta
            </a>
          </p>
          <div className="mt-8 text-sm bg-green-50 p-4 rounded">
            <span role="img" aria-label="info">ℹ️</span> <b>هذه مجرد تجربة عرض إلى حين توفير الربط الفعلي عبر API.</b>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsApp;
