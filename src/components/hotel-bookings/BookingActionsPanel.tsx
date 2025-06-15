
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HotelBooking } from "@/types/hotelBooking";
import BookingStatusHistory from "./BookingStatusHistory";

interface BookingActionsPanelProps {
  booking: HotelBooking;
  onEdit: (booking: HotelBooking) => void;
  onShowStatusHistory: (bookingId: string) => void;
}

const BookingActionsPanel = ({ booking, onEdit, onShowStatusHistory }: BookingActionsPanelProps) => {
  return (
    <div className="flex gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <History className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تاريخ حالات الحجز - {booking.internal_booking_number}</DialogTitle>
          </DialogHeader>
          <BookingStatusHistory bookingId={booking.id} />
        </DialogContent>
      </Dialog>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(booking)}
      >
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default BookingActionsPanel;
