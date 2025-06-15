
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ExchangeRateChartProps {
  data: Array<{
    date: string;
    rate: number;
    from_currency: string;
    to_currency: string;
  }>;
  pair: string;
}

const ExchangeRateChart = ({ data, pair }: ExchangeRateChartProps) => {
  const chartData = data
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      date: new Date(item.date).toLocaleDateString('ar-SA'),
      rate: parseFloat(item.rate.toString()),
      fullDate: item.date
    }));

  const currentRate = chartData[chartData.length - 1]?.rate || 0;
  const previousRate = chartData[chartData.length - 2]?.rate || 0;
  const trend = currentRate > previousRate ? 'up' : currentRate < previousRate ? 'down' : 'neutral';
  const changePercent = previousRate ? ((currentRate - previousRate) / previousRate * 100).toFixed(2) : '0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">اتجاه سعر {pair}</CardTitle>
          <div className="flex items-center gap-2">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : null}
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {changePercent}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tick={{ textAnchor: 'middle' }}
              />
              <YAxis 
                fontSize={12}
                domain={['dataMin - 0.001', 'dataMax + 0.001']}
              />
              <Tooltip 
                labelStyle={{ direction: 'rtl' }}
                contentStyle={{ direction: 'rtl' }}
                formatter={(value: number) => [value.toFixed(6), 'السعر']}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-8">
            لا توجد بيانات كافية لعرض الرسم البياني
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExchangeRateChart;
