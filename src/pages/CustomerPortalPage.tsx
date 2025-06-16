
import React from "react";
import CustomerPortal from "@/components/customers/CustomerPortal";
import { Customer } from "@/types/customer";

// بيانات عميل وهمية للعرض التوضيحي
const demoCustomer: Customer = {
  id: "demo-customer",
  name: "أحمد محمد علي",
  phone: "+20 100 123 4567",
  email: "ahmed.mohamed@example.com",
  nationality: "مصري",
  address: "القاهرة، مصر",
  loyalty_points: 1250,
  total_bookings: 8,
  total_spent: 45000,
  last_booking_date: "2024-01-15",
  created_at: "2023-06-10T10:00:00Z"
};

const CustomerPortalPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerPortal customer={demoCustomer} />
    </div>
  );
};

export default CustomerPortalPage;
