
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PerformanceMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  response_time: number;
  api_requests_per_hour: number;
  database_size: string;
  uptime: string;
  error_rate: number;
  query_performance: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  created_at: string;
}

export const usePerformanceMonitoring = () => {
  const [realTimeMetrics, setRealTimeMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // محاكاة جلب المقاييس في الوقت الفعلي
  const generateMockMetrics = (): PerformanceMetrics => {
    return {
      cpu_usage: Math.floor(Math.random() * 40) + 20,
      memory_usage: Math.floor(Math.random() * 30) + 50,
      disk_usage: Math.floor(Math.random() * 20) + 70,
      active_connections: Math.floor(Math.random() * 20) + 15,
      response_time: Math.floor(Math.random() * 100) + 80,
      api_requests_per_hour: Math.floor(Math.random() * 200) + 400,
      database_size: `${(Math.random() * 2 + 2).toFixed(1)} GB`,
      uptime: "7 أيام و 14 ساعة",
      error_rate: Math.random() * 5,
      query_performance: Math.floor(Math.random() * 50) + 100
    };
  };

  // جلب البيانات التاريخية للأداء
  const { data: historicalData, isLoading: historyLoading } = useQuery({
    queryKey: ['performance-history'],
    queryFn: async () => {
      // محاكاة بيانات تاريخية
      const history = [];
      const now = new Date();
      
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
        history.push({
          timestamp: timestamp.toISOString(),
          ...generateMockMetrics()
        });
      }
      
      return history;
    },
    refetchInterval: 5 * 60 * 1000 // تحديث كل 5 دقائق
  });

  // مراقبة التنبيهات
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: async () => {
      // محاكاة التنبيهات
      const mockAlerts: SystemAlert[] = [];
      const currentMetrics = generateMockMetrics();
      
      if (currentMetrics.cpu_usage > 80) {
        mockAlerts.push({
          id: '1',
          type: 'warning',
          message: 'استخدام المعالج مرتفع',
          metric: 'cpu_usage',
          value: currentMetrics.cpu_usage,
          threshold: 80,
          created_at: new Date().toISOString()
        });
      }
      
      if (currentMetrics.memory_usage > 85) {
        mockAlerts.push({
          id: '2',
          type: 'error',
          message: 'استخدام الذاكرة حرج',
          metric: 'memory_usage',
          value: currentMetrics.memory_usage,
          threshold: 85,
          created_at: new Date().toISOString()
        });
      }
      
      if (currentMetrics.response_time > 200) {
        mockAlerts.push({
          id: '3',
          type: 'warning',
          message: 'زمن الاستجابة بطيء',
          metric: 'response_time',
          value: currentMetrics.response_time,
          threshold: 200,
          created_at: new Date().toISOString()
        });
      }
      
      return mockAlerts;
    },
    refetchInterval: 2 * 60 * 1000 // تحديث كل دقيقتين
  });

  // بدء المراقبة في الوقت الفعلي
  const startMonitoring = () => {
    setIsMonitoring(true);
    const interval = setInterval(() => {
      setRealTimeMetrics(generateMockMetrics());
    }, 5000); // تحديث كل 5 ثوان

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  };

  // إيقاف المراقبة
  const stopMonitoring = () => {
    setIsMonitoring(false);
    setRealTimeMetrics(null);
  };

  // الحصول على اتجاه المقياس (صاعد/هابط/ثابت)
  const getMetricTrend = (metric: string): 'up' | 'down' | 'stable' => {
    if (!historicalData || historicalData.length < 2) return 'stable';
    
    const recent = historicalData.slice(-5);
    const values = recent.map(point => point[metric as keyof typeof point]);
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    const avg = sum / values.length;
    
    const lastValue = values[values.length - 1];
    const diff = lastValue - avg;
    
    if (Math.abs(diff) < avg * 0.05) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  // حساب متوسط مقياس
  const getMetricAverage = (metric: string, hours: number = 24): number => {
    if (!historicalData) return 0;
    
    const recentData = historicalData.slice(-hours);
    const values = recentData.map(point => point[metric as keyof typeof point]);
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    
    return sum / values.length;
  };

  // التحقق من صحة النظام
  const getSystemHealth = (): 'excellent' | 'good' | 'warning' | 'critical' => {
    const current = realTimeMetrics || generateMockMetrics();
    
    const criticalConditions = [
      current.cpu_usage > 90,
      current.memory_usage > 95,
      current.disk_usage > 95,
      current.response_time > 500
    ];
    
    const warningConditions = [
      current.cpu_usage > 70,
      current.memory_usage > 80,
      current.disk_usage > 85,
      current.response_time > 200
    ];
    
    if (criticalConditions.some(condition => condition)) {
      return 'critical';
    }
    
    if (warningConditions.some(condition => condition)) {
      return 'warning';
    }
    
    if (warningConditions.filter(condition => condition).length === 0) {
      return 'excellent';
    }
    
    return 'good';
  };

  // تشغيل المراقبة تلقائياً عند التحميل
  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, []);

  return {
    currentMetrics: realTimeMetrics || generateMockMetrics(),
    historicalData,
    alerts,
    systemHealth: getSystemHealth(),
    isMonitoring,
    isLoading: historyLoading || alertsLoading,
    startMonitoring,
    stopMonitoring,
    getMetricTrend,
    getMetricAverage,
    refreshData: () => {
      // يمكن إضافة logic لتحديث البيانات يدوياً
    }
  };
};
