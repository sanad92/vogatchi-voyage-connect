import React from "react";
import { FlightBooking } from "@/types/flightBooking";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

interface Props {
  open: boolean;
  booking: FlightBooking;
  onClose: () => void;
}

const FlightVoucherDialog: React.FC<Props> = ({ open, booking, onClose }) => {
  const { data: org } = useCurrentOrganization();
  if (!open) return null;
  const orgName = org?.name || 'مؤسستي';
  const orgContact = [org?.address, org?.phone, org?.email].filter(Boolean).join(' | ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full relative" dir="rtl">
        <button
          aria-label="إغلاق"
          className="absolute top-2 left-2 text-gray-400 text-xl"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="text-center border-b pb-4 mb-4">
          {org?.logo_url && (
            <img src={org.logo_url} alt={orgName} className="h-14 mx-auto mb-2 object-contain" />
          )}
          <h2 className="text-xl font-bold text-blue-700">{orgName}</h2>
          {orgContact && <p className="text-xs text-gray-500 mt-1">{orgContact}</p>}
        </div>
        <div>
          <h3 className="text-lg font-bold mb-2">فاوتشر حجز الطيران</h3>
          <p><strong>اسم العميل:</strong> {booking.customer_name}</p>
          <p><strong>رقم الحجز:</strong> {booking.booking_reference}</p>
          <p><strong>شركة الطيران:</strong> {booking.airline?.name}</p>
          <p><strong>من:</strong> {booking.departure_airport?.name}</p>
          <p><strong>إلى:</strong> {booking.arrival_airport?.name}</p>
        </div>
      </div>
    </div>
  );
};

export default FlightVoucherDialog;
