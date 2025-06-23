
import React, { useState } from 'react';
import { MessageCircle, Users, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConversationsList } from './ConversationsList';
import { ChatWindow } from './ChatWindow';
import { WhatsAppStats } from './WhatsAppStats';
import { SessionManager } from './SessionManager';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { WhatsAppConversation } from '@/types/whatsapp';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const WhatsAppDashboard = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { conversations, conversationsLoading, conversationsError } = useWhatsApp();
  const { currentEmployee, isLoading: employeeLoading } = useCurrentEmployee();

  // معالجة حالة الخطأ
  if (conversationsError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertDescription>
            حدث خطأ في تحميل البيانات. يرجى إعادة تحميل الصفحة.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // معالجة حالة التحميل
  if (conversationsLoading || employeeLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">جاري تحميل WhatsApp Business...</p>
        </div>
      </div>
    );
  }

  // Type-safe conversations conversion
  const typedConversations: WhatsAppConversation[] = (conversations || []).map(conv => ({
    ...conv,
    status: ['pending', 'active', 'closed', 'transferred'].includes(conv.status as string) 
      ? conv.status as 'pending' | 'active' | 'closed' | 'transferred'
      : 'pending',
    priority: ['low', 'normal', 'high', 'urgent'].includes(conv.priority as string)
      ? conv.priority as 'low' | 'normal' | 'high' | 'urgent'
      : 'normal'
  }));

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-green-600" />
              <h1 className="text-xl font-bold">WhatsApp Business</h1>
            </div>
            {currentEmployee && (
              <SessionManager employeeId={currentEmployee.id} />
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 border-r bg-gray-50 flex flex-col">
            <Tabs defaultValue="conversations" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 m-2">
                <TabsTrigger value="conversations">المحادثات</TabsTrigger>
                <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
              </TabsList>
              
              <TabsContent value="conversations" className="flex-1 p-2">
                <ConversationsList
                  conversations={typedConversations}
                  loading={conversationsLoading}
                  selectedId={selectedConversationId}
                  onSelect={setSelectedConversationId}
                />
              </TabsContent>
              
              <TabsContent value="stats" className="flex-1 p-2">
                <WhatsAppStats />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedConversationId ? (
              <ChatWindow 
                conversationId={selectedConversationId}
                onClose={() => setSelectedConversationId(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    اختر محادثة للبدء
                  </h3>
                  <p className="text-gray-600">
                    حدد محادثة من القائمة الجانبية لبدء التواصل مع العملاء
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default WhatsAppDashboard;
