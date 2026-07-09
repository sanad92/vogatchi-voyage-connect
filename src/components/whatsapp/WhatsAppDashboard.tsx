
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
import { useCurrentEmployeeEnhanced } from '@/hooks/useCurrentEmployeeEnhanced';
import { WhatsAppConversation } from '@/types/whatsapp';
import OptimizedErrorBoundary from '@/components/common/OptimizedErrorBoundary';

const WhatsAppDashboard = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { conversations, conversationsLoading, conversationsError } = useWhatsApp();
  const { currentEmployee, isLoading: employeeLoading } = useCurrentEmployeeEnhanced();

  // معالجة حالة الخطأ
  if (conversationsError) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Alert className="max-w-md border-destructive/30 bg-destructive/5">
          <AlertDescription className="text-destructive">
            حدث خطأ في تحميل البيانات. يرجى إعادة تحميل الصفحة.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // معالجة حالة التحميل
  if (conversationsLoading || employeeLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">جاري تحميل WhatsApp Business...</p>
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
    <OptimizedErrorBoundary>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="p-3 sm:p-4 border-b bg-card">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-lg sm:text-xl font-bold">WhatsApp Business</h1>
            </div>
            {currentEmployee && (
              <SessionManager employeeId={currentEmployee.id} />
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar - full width on mobile, fixed width on desktop */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-l bg-muted/30 flex flex-col shrink-0">
            <Tabs defaultValue="conversations" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 m-2">
                <TabsTrigger value="conversations">المحادثات</TabsTrigger>
                <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
              </TabsList>
              
              <TabsContent value="conversations" className="flex-1 p-2 overflow-y-auto max-h-[40vh] md:max-h-none">
                <ConversationsList
                  conversations={typedConversations}
                  loading={conversationsLoading}
                  selectedId={selectedConversationId}
                  onSelect={setSelectedConversationId}
                />
              </TabsContent>
              
              <TabsContent value="stats" className="flex-1 p-2 overflow-y-auto max-h-[40vh] md:max-h-none">
                <WhatsAppStats />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {selectedConversationId ? (
              <ChatWindow 
                conversationId={selectedConversationId}
                onClose={() => setSelectedConversationId(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center px-4">
                  <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
                    اختر محادثة للبدء
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    اختر محادثة من القائمة لبدء التواصل مع العملاء
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </OptimizedErrorBoundary>
  );
};

export default WhatsAppDashboard;
