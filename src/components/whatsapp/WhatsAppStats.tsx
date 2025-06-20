
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const WhatsAppStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's conversations count
      const { count: todayConversations } = await supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get active conversations count
      const { count: activeConversations } = await supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get today's messages count
      const { count: todayMessages } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', today);

      // Get average response time (simplified)
      const { data: responseData } = await supabase
        .from('whatsapp_analytics')
        .select('average_response_time')
        .eq('date', today)
        .single();

      return {
        todayConversations: todayConversations || 0,
        activeConversations: activeConversations || 0,
        todayMessages: todayMessages || 0,
        averageResponseTime: responseData?.average_response_time || '0 minutes'
      };
    }
  });

  const statCards = [
    {
      title: 'محادثات اليوم',
      value: stats?.todayConversations || 0,
      icon: MessageCircle,
      color: 'text-blue-600'
    },
    {
      title: 'محادثات نشطة',
      value: stats?.activeConversations || 0,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'رسائل اليوم',
      value: stats?.todayMessages || 0,
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'متوسط الرد',
      value: stats?.averageResponseTime || '0 د',
      icon: Clock,
      color: 'text-orange-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold">{String(stat.value)}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
