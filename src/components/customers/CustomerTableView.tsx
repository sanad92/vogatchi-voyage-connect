
import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Eye, 
  Edit, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign,
  User,
  Flag,
  Star,
  MessageCircle
} from "lucide-react";
import { Customer } from "@/types/customer";

interface CustomerTableViewProps {
  customers: Customer[];
  onCustomerSelect: (customerId: string) => void;
  onCustomerEdit?: (customer: Customer) => void;
  selectedCustomers: string[];
  onSelectionChange: (customerIds: string[]) => void;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

const CustomerTableView = ({ 
  customers, 
  onCustomerSelect, 
  onCustomerEdit,
  selectedCustomers,
  onSelectionChange 
}: CustomerTableViewProps) => {
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'select', label: 'اختيار', visible: true, width: 'w-12' },
    { key: 'name', label: 'الاسم', visible: true, width: 'w-48' },
    { key: 'phone', label: 'الهاتف', visible: true, width: 'w-36' },
    { key: 'email', label: 'البريد الإلكتروني', visible: true, width: 'w-48' },
    { key: 'nationality', label: 'الجنسية', visible: true, width: 'w-32' },
    { key: 'segment', label: 'الشريحة', visible: true, width: 'w-28' },
    { key: 'totalBookings', label: 'عدد الحجوزات', visible: true, width: 'w-32' },
    { key: 'totalSpent', label: 'إجمالي الإنفاق', visible: true, width: 'w-36' },
    { key: 'lastBooking', label: 'آخر حجز', visible: true, width: 'w-32' },
    { key: 'loyaltyPoints', label: 'نقاط الولاء', visible: false, width: 'w-28' },
    { key: 'createdAt', label: 'تاريخ التسجيل', visible: false, width: 'w-32' },
    { key: 'actions', label: 'الإجراءات', visible: true, width: 'w-32' },
  ]);

  const visibleColumns = useMemo(() => 
    columns.filter(col => col.visible), 
    [columns]
  );

  const toggleColumn = (columnKey: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.key === columnKey 
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(customers.map(customer => customer.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedCustomers, customerId]);
    } else {
      onSelectionChange(selectedCustomers.filter(id => id !== customerId));
    }
  };

  const isAllSelected = selectedCustomers.length === customers.length && customers.length > 0;
  const isPartiallySelected = selectedCustomers.length > 0 && selectedCustomers.length < customers.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  const getSegmentBadge = (segment?: any) => {
    if (!segment) return null;
    
    return (
      <Badge 
        variant="outline" 
        style={{ 
          borderColor: segment.color, 
          color: segment.color 
        }}
      >
        {segment.name_ar}
      </Badge>
    );
  };

  const renderCell = (customer: Customer, columnKey: string) => {
    switch (columnKey) {
      case 'select':
        return (
          <Checkbox
            checked={selectedCustomers.includes(customer.id)}
            onCheckedChange={(checked) => 
              handleSelectCustomer(customer.id, checked as boolean)
            }
          />
        );
      
      case 'name':
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{customer.name}</span>
          </div>
        );
      
      case 'phone':
        return (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-gray-400" />
            <span dir="ltr">{customer.phone}</span>
          </div>
        );
      
      case 'email':
        return customer.email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="text-sm">{customer.email}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">غير متوفر</span>
        );
      
      case 'nationality':
        return customer.nationality ? (
          <div className="flex items-center gap-2">
            <Flag className="h-3 w-3 text-gray-400" />
            <span>{customer.nationality}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">غير محدد</span>
        );
      
      case 'segment':
        return getSegmentBadge(customer.segment);
      
      case 'totalBookings':
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span>{customer.total_bookings || 0}</span>
          </div>
        );
      
      case 'totalSpent':
        return (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-gray-400" />
            <span>{formatCurrency(customer.total_spent || 0)}</span>
          </div>
        );
      
      case 'lastBooking':
        return customer.last_booking_date ? (
          <span className="text-sm">{formatDate(customer.last_booking_date)}</span>
        ) : (
          <span className="text-gray-400 text-sm">لا يوجد</span>
        );
      
      case 'loyaltyPoints':
        return (
          <div className="flex items-center gap-2">
            <Star className="h-3 w-3 text-yellow-500" />
            <span>{customer.loyalty_points || 0}</span>
          </div>
        );
      
      case 'createdAt':
        return customer.created_at ? (
          <span className="text-sm">{formatDate(customer.created_at)}</span>
        ) : null;
      
      case 'actions':
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCustomerSelect(customer.id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
            {onCustomerEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCustomerEdit(customer)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (customer.phone) {
                  window.open(`https://wa.me/${customer.phone}`, '_blank');
                }
              }}
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* شريط أدوات الجدول */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedCustomers.length > 0 && (
            <Badge variant="secondary">
              {selectedCustomers.length} عميل محدد
            </Badge>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              تخصيص الأعمدة
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {columns.filter(col => col.key !== 'select' && col.key !== 'actions').map(column => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.key)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* الجدول */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {visibleColumns.map(column => (
                <TableHead 
                  key={column.key} 
                  className={`text-right ${column.width || ''}`}
                >
                  {column.key === 'select' ? (
                    <Checkbox
                      checked={isAllSelected}
                      ref={(ref) => {
                        if (ref) ref.indeterminate = isPartiallySelected;
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length} 
                  className="text-center py-8 text-gray-500"
                >
                  لا توجد عملاء
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow 
                  key={customer.id}
                  className={selectedCustomers.includes(customer.id) ? 'bg-blue-50' : ''}
                >
                  {visibleColumns.map(column => (
                    <TableCell key={column.key}>
                      {renderCell(customer, column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CustomerTableView;
