
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, MapPin, Flag, Edit, Eye, Star } from "lucide-react";
import { useState } from "react";
import CustomerEditDialog from "./CustomerEditDialog";
import { Customer } from "@/types/customer";

interface CustomerCardProps {
  customer: Customer;
  onSelect: () => void;
  onCustomerUpdated: (customer: any) => void;
}

const CustomerCard = ({ customer, onSelect, onCustomerUpdated }: CustomerCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-lg text-gray-900">{customer.name}</h3>
            </div>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleEditClick}
                className="h-7 w-7 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleViewClick}
                className="h-7 w-7 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-3 w-3" />
              <span>{customer.phone}</span>
            </div>
            
            {customer.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3 w-3" />
                <span>{customer.email}</span>
              </div>
            )}
            
            {customer.nationality && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Flag className="h-3 w-3" />
                <span>{customer.nationality}</span>
              </div>
            )}
            
            {customer.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{customer.address}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {customer.segment && (
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${customer.segment.color}20`,
                    color: customer.segment.color,
                    borderColor: customer.segment.color
                  }}
                >
                  {customer.segment.name_ar || customer.segment.name}
                </Badge>
              )}
              {customer.loyalty_points && customer.loyalty_points > 0 && (
                <div className="flex items-center gap-1 text-xs text-yellow-600">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{customer.loyalty_points}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center text-xs">
            <div>
              <div className="font-medium text-blue-600">{customer.total_bookings || 0}</div>
              <div className="text-gray-500">حجز</div>
            </div>
            <div>
              <div className="font-medium text-green-600">{formatCurrency(customer.total_spent || 0)}</div>
              <div className="text-gray-500">إجمالي</div>
            </div>
          </div>

          {customer.last_booking_date && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                آخر حجز: {formatDate(customer.last_booking_date)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerEditDialog
        customerId={customer.id}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onCustomerUpdated={onCustomerUpdated}
      />
    </>
  );
};

export default CustomerCard;
