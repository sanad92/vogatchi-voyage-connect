
import { Card, CardContent } from "@/components/ui/card";

interface CustomerStatsProps {
  totalCustomers: number;
  activeCustomers: number;
  needsFollowUp: number;
  noCommunication: number;
}

const CustomerStats = ({
  totalCustomers,
  activeCustomers,
  needsFollowUp,
  noCommunication
}: CustomerStatsProps) => {
  const stats = [
    {
      title: "إجمالي العملاء",
      value: totalCustomers,
      color: "blue"
    },
    {
      title: "عملاء نشطين",
      value: activeCustomers,
      color: "green"
    },
    {
      title: "يحتاجون متابعة",
      value: needsFollowUp,
      color: "yellow"
    },
    {
      title: "بدون تواصل",
      value: noCommunication,
      color: "purple"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.title}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CustomerStats;
