
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

interface FlightBookingEmptyStateProps {
  onCreateNew: () => void;
}

const FlightBookingEmptyState = ({ onCreateNew }: FlightBookingEmptyStateProps) => {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حجوزات طيران</h3>
        <p className="text-gray-500 mb-4">ابدأ بإنشاء حجز طيران جديد</p>
        <Button onClick={onCreateNew}>
          إنشاء حجز جديد
        </Button>
      </CardContent>
    </Card>
  );
};

export default FlightBookingEmptyState;
