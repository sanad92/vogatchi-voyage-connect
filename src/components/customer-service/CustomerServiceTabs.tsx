
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, MessageSquare, Calendar, FileText, Star } from 'lucide-react';
import CustomerProfile from './CustomerProfile';
import CommunicationHistory from './CommunicationHistory';
import BookingFollowUps from './BookingFollowUps';

interface CustomerServiceTabsProps {
  customer: any;
  onUpdate?: () => void;
}

const CustomerServiceTabs = ({ customer, onUpdate }: CustomerServiceTabsProps) => {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">الملف الشخصي</span>
        </TabsTrigger>
        <TabsTrigger value="communication" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">التواصل</span>
        </TabsTrigger>
        <TabsTrigger value="bookings" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">الحجوزات</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">الملاحظات</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <CustomerProfile customer={customer} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="communication" className="mt-6">
        <CommunicationHistory 
          customerId={customer.id} 
          communications={customer.communications || []} 
        />
      </TabsContent>

      <TabsContent value="bookings" className="mt-6">
        <BookingFollowUps 
          customerId={customer.id} 
          bookings={customer.bookings || []} 
        />
      </TabsContent>

      <TabsContent value="notes" className="mt-6">
        <div className="space-y-4">
          {customer.notes && customer.notes.length > 0 ? (
            customer.notes.map((note: any) => (
              <div key={note.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{note.note_type}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(note.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <p>{note.content}</p>
                {note.priority !== 'normal' && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      note.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      note.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {note.priority === 'urgent' && 'عاجل'}
                      {note.priority === 'high' && 'مهم'}
                      {note.priority === 'low' && 'منخفض الأولوية'}
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">
              لا توجد ملاحظات لهذا العميل
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default CustomerServiceTabs;
