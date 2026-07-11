import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2, Loader2, MessageCircle, Pencil, Plus, Star, Unplug, XCircle,
} from 'lucide-react';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { WhatsAppConnectCard } from './WhatsAppConnectCard';

export const WhatsAppInboxList: React.FC = () => {
  const {
    inboxes, isLoading,
    setDefault, isSettingDefault,
    renameInbox,
    disconnectInbox, isDisconnecting,
  } = useWhatsAppSettings();
  const [showConnect, setShowConnect] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const activeInboxes = inboxes.filter((i) => i.onboarding_status !== 'disconnected');

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              أرقام واتساب المربوطة
            </CardTitle>
            <CardDescription>
              يمكنك ربط أكثر من رقم WhatsApp Business لنفس المؤسسة — كل رقم بصندوق وارد مستقل. الرقم المُميّز كافتراضي هو الذي يُستخدم للأتمتة والإرسال الافتراضي.
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowConnect((s) => !s)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {showConnect ? 'إغلاق' : 'ربط رقم جديد'}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
            </div>
          ) : activeInboxes.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">
              لا توجد أرقام مربوطة بعد. اضغط <strong>«ربط رقم جديد»</strong> للبدء.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم / التسمية</TableHead>
                    <TableHead className="text-right">الرقم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">افتراضي</TableHead>
                    <TableHead className="text-right w-[280px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeInboxes.map((inbox) => {
                    const connected = inbox.onboarding_status === 'connected' && inbox.is_active;
                    return (
                      <TableRow key={inbox.id}>
                        <TableCell>
                          {editingId === inbox.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="h-8 max-w-[180px]"
                                placeholder="مثال: المبيعات"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  renameInbox({ id: inbox.id, label: editLabel.trim() });
                                  setEditingId(null);
                                }}
                              >
                                حفظ
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                إلغاء
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium">
                                  {inbox.label || inbox.business_name || 'رقم واتساب'}
                                </div>
                                {inbox.label && inbox.business_name && (
                                  <div className="text-xs text-muted-foreground">
                                    {inbox.business_name}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingId(inbox.id);
                                  setEditLabel(inbox.label ?? '');
                                }}
                                title="تعديل التسمية"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {inbox.display_phone_number || '—'}
                        </TableCell>
                        <TableCell>
                          {connected ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle2 className="w-3 h-3 ml-1" /> متصل
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <XCircle className="w-3 h-3 ml-1" /> غير متصل
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {inbox.is_default ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                              <Star className="w-3 h-3" /> افتراضي
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {!inbox.is_default && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDefault(inbox.id)}
                                disabled={isSettingDefault}
                              >
                                <Star className="w-3.5 h-3.5 ml-1" />
                                تعيين افتراضي
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                  <Unplug className="w-3.5 h-3.5 ml-1" />
                                  فصل
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent dir="rtl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد فصل الرقم</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم إيقاف استقبال وإرسال الرسائل لهذا الرقم ({inbox.display_phone_number || inbox.phone_number_id}).
                                    المحادثات والرسائل السابقة تبقى محفوظة.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => disconnectInbox(inbox.id)}
                                    disabled={isDisconnecting}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    فصل الرقم
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {(showConnect || activeInboxes.length === 0) && <WhatsAppConnectCard />}
    </div>
  );
};

export default WhatsAppInboxList;
