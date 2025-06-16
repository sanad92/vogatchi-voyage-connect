
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  Send,
  Users,
  Clock,
  CheckCircle
} from "lucide-react";
import { Customer } from "@/types/customer";

interface CustomerCommunicationHubProps {
  customers: Customer[];
  selectedCustomers: string[];
}

const CustomerCommunicationHub = ({ customers, selectedCustomers }: CustomerCommunicationHubProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [messageType, setMessageType] = useState("whatsapp");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const selectedCustomersData = customers.filter(customer => 
    selectedCustomers.includes(customer.id)
  );

  const messageTemplates = {
    whatsapp: [
      {
        name: "ترحيب بعميل جديد",
        content: "مرحباً {name}، نرحب بك في شركة فيجن للسياحة. نحن هنا لخدمتك في أي وقت."
      },
      {
        name: "تذكير بالحجز",
        content: "عزيزي {name}، نذكرك بموعد رحلتك القادمة. للاستفسار يرجى التواصل معنا."
      },
      {
        name: "عرض خاص",
        content: "عميلنا العزيز {name}، لدينا عرض خاص لك! خصم 15% على جميع الرحلات."
      },
      {
        name: "استطلاع رضا",
        content: "مرحباً {name}، نود معرفة رأيك في خدماتنا. كيف كانت تجربتك معنا؟"
      }
    ],
    email: [
      {
        name: "رسالة ترحيب",
        content: "نرحب بك في عائلة فيجن للسياحة ونتطلع لخدمتك بأفضل ما لدينا."
      },
      {
        name: "تأكيد الحجز",
        content: "تم تأكيد حجزك بنجاح. ستجد كافة التفاصيل في المرفقات."
      },
      {
        name: "فاتورة مالية",
        content: "تجد في المرفق فاتورتك المالية مع كافة التفاصيل."
      }
    ],
    sms: [
      {
        name: "تذكير سريع",
        content: "تذكير: موعد رحلتك غداً. فيجن للسياحة"
      },
      {
        name: "رمز تأكيد",
        content: "رمز التأكيد: 123456. فيجن للسياحة"
      }
    ]
  };

  const handleSendMessage = () => {
    const finalMessage = customMessage || messageTemplate;
    
    selectedCustomersData.forEach(customer => {
      const personalizedMessage = finalMessage.replace('{name}', customer.name);
      
      if (messageType === 'whatsapp') {
        // إرسال رسالة واتساب
        const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodeURIComponent(personalizedMessage)}`;
        window.open(whatsappUrl, '_blank');
      } else if (messageType === 'email') {
        // إرسال بريد إلكتروني
        const emailUrl = `mailto:${customer.email}?subject=رسالة من فيجن للسياحة&body=${encodeURIComponent(personalizedMessage)}`;
        window.open(emailUrl, '_blank');
      }
      // يمكن إضافة SMS API هنا
    });

    setIsDialogOpen(false);
    setCustomMessage("");
    setMessageTemplate("");
  };

  const getCommunicationStats = () => {
    const withWhatsApp = selectedCustomersData.filter(c => c.phone).length;
    const withEmail = selectedCustomersData.filter(c => c.email).length;
    const withoutContact = selectedCustomersData.filter(c => !c.phone && !c.email).length;

    return { withWhatsApp, withEmail, withoutContact };
  };

  const stats = getCommunicationStats();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          مركز التواصل المتعدد
        </CardTitle>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={selectedCustomers.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              إرسال رسالة
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إرسال رسالة جماعية</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* إحصائيات التواصل */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <MessageCircle className="h-6 w-6 mx-auto text-green-600 mb-1" />
                  <p className="font-medium">{stats.withWhatsApp}</p>
                  <p className="text-xs text-gray-600">واتساب</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Mail className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                  <p className="font-medium">{stats.withEmail}</p>
                  <p className="text-xs text-gray-600">بريد إلكتروني</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Users className="h-6 w-6 mx-auto text-gray-600 mb-1" />
                  <p className="font-medium">{stats.withoutContact}</p>
                  <p className="text-xs text-gray-600">بدون تواصل</p>
                </div>
              </div>

              {/* اختيار نوع الرسالة */}
              <div>
                <label className="text-sm font-medium mb-2 block">نوع الرسالة</label>
                <Tabs value={messageType} onValueChange={setMessageType}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      واتساب
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      إيميل
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      SMS
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={messageType} className="mt-4">
                    <div className="space-y-4">
                      {/* قوالب الرسائل */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">قوالب جاهزة</label>
                        <Select value={messageTemplate} onValueChange={setMessageTemplate}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر قالب رسالة" />
                          </SelectTrigger>
                          <SelectContent>
                            {messageTemplates[messageType as keyof typeof messageTemplates]?.map((template, index) => (
                              <SelectItem key={index} value={template.content}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* محتوى الرسالة */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          محتوى الرسالة
                          <span className="text-xs text-gray-500 ml-2">
                            يمكنك استخدام {'{name}'} لإدراج اسم العميل
                          </span>
                        </label>
                        <Textarea
                          placeholder="اكتب رسالتك هنا..."
                          value={customMessage || messageTemplate}
                          onChange={(e) => {
                            setCustomMessage(e.target.value);
                            setMessageTemplate("");
                          }}
                          rows={4}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* قائمة العملاء المحددين */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  العملاء المحددين ({selectedCustomersData.length})
                </label>
                <div className="max-h-32 overflow-y-auto space-y-2 bg-gray-50 p-3 rounded-lg">
                  {selectedCustomersData.map(customer => (
                    <div key={customer.id} className="flex items-center justify-between text-sm">
                      <span>{customer.name}</span>
                      <div className="flex gap-1">
                        {customer.phone && <Badge variant="outline" className="text-xs">واتساب</Badge>}
                        {customer.email && <Badge variant="outline" className="text-xs">إيميل</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSendMessage}
                  disabled={!customMessage && !messageTemplate}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  إرسال الرسالة ({selectedCustomersData.length})
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {selectedCustomers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            اختر عملاء من الجدول لبدء التواصل معهم
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* إحصائيات سريعة */}
              <div className="text-center p-3 border rounded-lg">
                <MessageCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="font-medium">{stats.withWhatsApp}</p>
                <p className="text-sm text-gray-600">يمكن الوصول عبر واتساب</p>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <Mail className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="font-medium">{stats.withEmail}</p>
                <p className="text-sm text-gray-600">يمكن الوصول عبر الإيميل</p>
              </div>

              <div className="text-center p-3 border rounded-lg">
                <Clock className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                <p className="font-medium">{stats.withoutContact}</p>
                <p className="text-sm text-gray-600">يحتاج تحديث بيانات</p>
              </div>
            </div>

            {/* إجراءات سريعة */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMessageType("whatsapp");
                  setIsDialogOpen(true);
                }}
                disabled={stats.withWhatsApp === 0}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                واتساب جماعي
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMessageType("email");
                  setIsDialogOpen(true);
                }}
                disabled={stats.withEmail === 0}
              >
                <Mail className="h-3 w-3 mr-1" />
                إيميل جماعي
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerCommunicationHub;
