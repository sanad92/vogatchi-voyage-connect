
import React from "react";
import { DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface InvoiceHeaderProps {
  invoice: any;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
}

const InvoiceHeader = ({ invoice, getStatusLabel, getStatusColor }: InvoiceHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <DialogTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        فاتورة رقم {invoice.invoice_number}
      </DialogTitle>
      <div className="flex items-center gap-2">
        <Badge variant={getStatusColor(invoice.status)}>
          {getStatusLabel(invoice.status)}
        </Badge>
      </div>
    </div>
  );
};

export default InvoiceHeader;
