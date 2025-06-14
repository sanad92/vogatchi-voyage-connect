
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, MapPin, Calendar, MessageSquare, FileText, Star } from 'lucide-react';
import { useState } from 'react';
import { useCustomerService } from '@/hooks/useCustomerService';
import { useAuth } from '@/hooks/useAuth';
import { CustomerNote, CustomerCommunication } from '@/types/customerService';

interface CustomerProfileProps {
  customer: any;
  onUpdate?: () => void;
}

const CustomerProfile = ({ customer, onUpdate }: CustomerProfileProps) => {
  const { profile } = useAuth();
  const { addNote, addCommunication } = useCustomerService();
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<CustomerNote['note_type']>('general');
  const [priority, setPriority] = useState<CustomerNote['priority']>('normal');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim() || !profile?.id) return;

    await addNote({
      customer_id: customer.id,
      content: newNote,
      note_type: noteType,
      priority,
      is_private: false,
      created_by: profile.id
    });

    setNewNote('');
    setIsAddingNote(false);
    onUpdate?.();
  };

  const handleCommunicate = (type: CustomerCommunication['communication_type']) => {
    if (!profile?.id) return;

    addCommunication({
      customer_id: customer.id,
      communication_type: type,
      direction: 'outbound',
      status: 'scheduled',
      handled_by: profile.id
    });
  };

  return (
    <div className="space-y-6">
      {/* معلومات العميل الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            معلومات العميل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{customer.name}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>
          
          {/* أزرار التواصل السريع */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCommunicate('call')}
              className="flex items-center gap-1"
            >
              <Phone className="h-4 w-4" />
              اتصال
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCommunicate('whatsapp')}
              className="flex items-center gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              واتساب
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCommunicate('email')}
              className="flex items-center gap-1"
            >
              <Mail className="h-4 w-4" />
              إيميل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* إضافة ملاحظة جديدة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إضافة ملاحظة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAddingNote ? (
            <Button onClick={() => setIsAddingNote(true)}>
              إضافة ملاحظة جديدة
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">نوع الملاحظة</label>
                  <Select value={noteType} onValueChange={(value: CustomerNote['note_type']) => setNoteType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">عامة</SelectItem>
                      <SelectItem value="preference">تفضيلات</SelectItem>
                      <SelectItem value="complaint">شكوى</SelectItem>
                      <SelectItem value="special_request">طلب خاص</SelectItem>
                      <SelectItem value="medical">طبية</SelectItem>
                      <SelectItem value="dietary">غذائية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">الأولوية</label>
                  <Select value={priority} onValueChange={(value: CustomerNote['priority']) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="normal">عادية</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="urgent">عاجلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Textarea
                placeholder="اكتب ملاحظتك هنا..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-24"
              />
              
              <div className="flex gap-2">
                <Button onClick={handleAddNote}>
                  حفظ الملاحظة
                </Button>
                <Button variant="outline" onClick={() => setIsAddingNote(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* عرض الملاحظات الموجودة */}
      {customer.notes && customer.notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الملاحظات السابقة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customer.notes.slice(0, 3).map((note: any) => (
                <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{note.note_type}</Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(note.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <p className="text-sm">{note.content}</p>
                </div>
              ))}
              {customer.notes.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  و {customer.notes.length - 3} ملاحظات أخرى...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerProfile;
