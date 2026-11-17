import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCircle, AlertTriangle, Info, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications, unreadCount, isLoading, isError, refresh,
    markAsReadAsync, markAllAsRead, isMarkingAsRead,
  } = useNotifications(true);

  const openNotification = async (notification: typeof notifications[number]) => {
    try {
      if (!notification.is_read) await markAsReadAsync(notification.id);
    } catch {
      return;
    }
    const url = notification.action_url;
    if (url && /^\/(?![\s/\\])[^\\\u0000-\u001f]*$/.test(url)) {
      setOpen(false);
      navigate(url);
    }
  };

  const icon = (type: string | null) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'error': return <X className="h-4 w-4 text-red-500 shrink-0" />;
      default: return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={value => { setOpen(value); if (value) void refresh(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `الإشعارات (${unreadCount} غير مقروءة)` : 'الإشعارات'}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] p-0" dir="rtl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">الإشعارات</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead} disabled={isMarkingAsRead}>
              <Check className="h-3 w-3 ml-1" />
              قراءة الكل
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <p role="status" className="p-5 text-center text-sm text-muted-foreground">جاري التحميل...</p>
          ) : isError ? (
            <div role="alert" className="space-y-2 p-5 text-center text-sm">
              <p>تعذّر تحميل الإشعارات.</p>
              <Button size="sm" variant="outline" onClick={() => void refresh()}>إعادة المحاولة</Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                className={`w-full text-right flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-0 ${!n.is_read ? 'bg-primary/5' : ''}`}
                onClick={() => void openNotification(n)}
                disabled={isMarkingAsRead}
              >
                {icon(n.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {n.created_at && formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                  </p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
