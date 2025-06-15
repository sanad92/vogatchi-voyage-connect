
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, Shield } from "lucide-react";

interface UserStatsCardsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    noRole: number;
  };
}

const UserStatsCards = ({ stats }: UserStatsCardsProps) => {
  const cards = [
    {
      title: "إجمالي المستخدمين",
      value: stats?.total || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500"
    },
    {
      title: "المستخدمين النشطين",
      value: stats?.active || 0,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500"
    },
    {
      title: "المستخدمين المعطلين",
      value: stats?.inactive || 0,
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-l-red-500"
    },
    {
      title: "بدون أدوار",
      value: stats?.noRole || 0,
      icon: Shield,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-l-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className={`border-l-4 ${card.borderColor} ${card.bgColor}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Icon className={`h-8 w-8 ${card.color}`} />
                <div>
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default UserStatsCards;
