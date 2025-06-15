
import { useState } from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Customer } from "@/types/customer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CustomerSearch from "@/components/customers/CustomerSearch";
import QuickCustomerAdd from "@/components/customers/QuickCustomerAdd";

interface CustomerSelectionProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
}

const CustomerSelection = ({
  selectedCustomer,
  onCustomerSelect,
  register,
  setValue,
  errors
}: CustomerSelectionProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setValue('customer_name', customer.full_name || customer.name);
    setValue('customer_id', customer.id);
    setIsSearchOpen(false);
  };

  const handleQuickAdd = (customer: Customer) => {
    handleCustomerSelect(customer);
    setIsAddOpen(false);
  };

  const handleNewCustomer = () => {
    setIsSearchOpen(false);
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="customer_name">اسم العميل *</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="customer_name"
            {...register("customer_name", { required: "اسم العميل مطلوب" })}
            placeholder="اسم العميل"
            readOnly={!!selectedCustomer}
            className={selectedCustomer ? "bg-gray-50" : ""}
          />
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Search className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>البحث عن عميل</DialogTitle>
              </DialogHeader>
              <CustomerSearch 
                onCustomerSelect={handleCustomerSelect} 
                onNewCustomer={handleNewCustomer}
                selectedCustomer={selectedCustomer}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة عميل جديد</DialogTitle>
              </DialogHeader>
              <QuickCustomerAdd 
                onCustomerAdded={handleQuickAdd}
                onCancel={() => setIsAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        {errors.customer_name && (
          <p className="text-red-500 text-sm mt-1">
            {typeof errors.customer_name.message === 'string' ? errors.customer_name.message : 'اسم العميل مطلوب'}
          </p>
        )}
      </div>

      {selectedCustomer && (
        <div className="bg-blue-50 p-3 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">العميل المحدد</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onCustomerSelect(null);
                setValue('customer_name', '');
                setValue('customer_id', '');
              }}
              type="button"
            >
              إلغاء التحديد
            </Button>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{selectedCustomer.full_name || selectedCustomer.name}</Badge>
              {selectedCustomer.phone && (
                <Badge variant="outline" className="text-xs">{selectedCustomer.phone}</Badge>
              )}
              {selectedCustomer.email && (
                <Badge variant="outline" className="text-xs">{selectedCustomer.email}</Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSelection;
