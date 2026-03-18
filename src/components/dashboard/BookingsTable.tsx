import { useState } from 'react';
import { Eye, Edit, FileText, MoreHorizontal, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Booking {
  id: string;
  internal_booking_number: string;
  customer_name: string;
  hotel_name: string;
  check_in_date: string;
  total_cost_customer: number;
  booking_statuses?: {
    name: string;
    name_ar: string;
    color?: string;
  };
}

interface BookingsTableProps {
  bookings?: Booking[];
  onViewBooking?: (booking: Booking) => void;
  onEditBooking?: (booking: Booking) => void;
  onDeleteBooking?: (booking: Booking) => void;
}

const BookingsTable = ({
  bookings = [],
  onViewBooking,
  onEditBooking,
  onDeleteBooking,
}: BookingsTableProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === bookings.length) {
      setSelected(new Set());
      return;
    }

    setSelected(new Set(bookings.map((booking) => booking.id)));
  };

  if (!bookings.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {'\u0623\u062d\u062f\u062b \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">{'\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a'}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {'\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0647\u0646\u0627'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          {'\u0623\u062d\u062f\u062b \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a'}
        </CardTitle>
        {selected.size > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selected.size} {'\u0645\u062d\u062f\u062f'}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/40 border-b-2 border-border/60">
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={bookings.length > 0 && selected.size === bookings.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-center font-semibold text-xs tracking-wider text-muted-foreground">
                  {'\u0627\u0644\u0645\u0631\u062c\u0639'}
                </TableHead>
                <TableHead className="text-center font-semibold text-xs tracking-wider text-muted-foreground">
                  {'\u0627\u0644\u0639\u0645\u064a\u0644'}
                </TableHead>
                <TableHead className="text-center font-semibold text-xs tracking-wider text-muted-foreground hidden sm:table-cell">
                  {'\u0627\u0644\u0641\u0646\u062f\u0642'}
                </TableHead>
                <TableHead className="text-center font-semibold text-xs tracking-wider text-muted-foreground hidden md:table-cell">
                  {'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062f\u062e\u0648\u0644'}
                </TableHead>
                <TableHead className="text-center font-semibold text-xs tracking-wider text-muted-foreground">
                  {'\u0627\u0644\u062d\u0627\u0644\u0629'}
                </TableHead>
                <TableHead className="text-center font-semibold text-xs tracking-wider text-muted-foreground">
                  {'\u0627\u0644\u0645\u0628\u0644\u063a'}
                </TableHead>
                <TableHead className="w-10 text-center" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {bookings.map((booking, idx) => {
                const status = booking.booking_statuses;

                return (
                  <TableRow
                    key={booking.id}
                    className={cn('group transition-colors', idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/20')}
                  >
                    <TableCell className="text-center align-middle">
                      <Checkbox
                        checked={selected.has(booking.id)}
                        onCheckedChange={() => toggleSelect(booking.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-primary text-center align-middle">
                      {booking.internal_booking_number}
                    </TableCell>
                    <TableCell className="font-medium text-sm text-center align-middle">{booking.customer_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell text-center align-middle">
                      {booking.hotel_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell text-center align-middle">
                      {booking.check_in_date ? new Date(booking.check_in_date).toLocaleDateString('ar-EG') : '-'}
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <Badge
                        className="text-xs font-semibold border"
                        style={
                          status?.color
                            ? {
                                backgroundColor: `${status.color}18`,
                                color: status.color,
                                borderColor: `${status.color}50`,
                              }
                            : {}
                        }
                      >
                        {status?.name_ar || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm tabular-nums align-middle">
                      {(booking.total_cost_customer || 0).toLocaleString('ar-EG')} {'\u062c.\u0645'}
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewBooking?.(booking)} disabled={!onViewBooking}>
                            <Eye className="h-4 w-4 mr-2" />
                            {'\u0639\u0631\u0636'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditBooking?.(booking)} disabled={!onEditBooking}>
                            <Edit className="h-4 w-4 mr-2" />
                            {'\u062a\u0639\u062f\u064a\u0644'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteBooking?.(booking)}
                            disabled={!onDeleteBooking}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {'\u062d\u0630\u0641'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingsTable;
