import React, { useState } from 'react';
import { FileText, Download, MapPin, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useSignedMediaUrl } from '@/hooks/useSignedMediaUrl';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

interface Props {
  message: any;
  outbound: boolean;
}

export const WhatsAppMediaMessage: React.FC<Props> = ({ message, outbound }) => {
  const path = message.media_storage_path as string | null | undefined;
  const directUrl = message.media_url as string | null | undefined;
  const downloadStatus = message.media_download_status as
    | 'pending' | 'success' | 'failed' | null | undefined;
  const downloadError = message.media_download_error as string | null | undefined;
  const providerId = message.media_provider_id as string | null | undefined;
  const { data: signedUrl, isLoading, isError, refetch } = useSignedMediaUrl(path);
  const type = message.message_type as string;
  const rawMime = (message.media_mime_type as string) || '';
  const mime = rawMime.split(';')[0].trim().toLowerCase();
  const caption = message.media_caption || (type === 'text' ? null : message.content);
  const fileName = message.media_file_name || 'file';

  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  // Non-media types
  if (type === 'text') {
    return <div className="whitespace-pre-wrap break-words text-sm">{message.content || '—'}</div>;
  }

  if (type === 'template') {
    return <div className="text-sm italic opacity-80">[قالب: {message.template_name || '—'}]</div>;
  }

  if (type === 'location' && message.content) {
    try {
      const loc = JSON.parse(message.content);
      const url = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
      return (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
          <MapPin className="h-4 w-4" />
          {loc.name || `${loc.lat}, ${loc.lng}`}
        </a>
      );
    } catch {
      return <div className="text-sm">{message.content}</div>;
    }
  }

  if (type === 'reaction' || type === 'interactive' || type === 'button') {
    return <div className="text-sm">{message.content || '—'}</div>;
  }

  const handleRetry = async () => {
    if (!message.id) return;
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-whatsapp-media', {
        body: { messageId: message.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('تم تحميل الملف بنجاح');
        await queryClient.invalidateQueries({
          queryKey: ['whatsapp-messages', orgId, message.conversation_id],
        });
      } else {
        throw new Error(data?.error || 'فشلت المحاولة');
      }
    } catch (e: any) {
      toast.error(`تعذر إعادة التحميل: ${e?.message ?? 'خطأ غير معروف'}`);
    } finally {
      setRetrying(false);
    }
  };

  const renderRetryError = (label: string) => (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-1.5">
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      {downloadError && (
        <div className="opacity-70 font-mono text-[10px] line-clamp-2">{downloadError}</div>
      )}
      {providerId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px]"
          disabled={retrying}
          onClick={handleRetry}
        >
          {retrying ? (
            <><Loader2 className="h-3 w-3 animate-spin mr-1" /> جاري المحاولة...</>
          ) : (
            <><RefreshCw className="h-3 w-3 mr-1" /> إعادة المحاولة</>
          )}
        </Button>
      )}
    </div>
  );

  const mediaContent = () => {
    // No stored path — check other options
    if (!path) {
      if (directUrl) return renderMedia(directUrl);

      // Explicitly failed
      if (downloadStatus === 'failed') {
        const isAudio = type === 'audio' || type === 'voice';
        return renderRetryError(isAudio ? 'تعذر تحميل الملف الصوتي' : `تعذر تحميل [${type}]`);
      }

      // Still pending or unknown — show loading with manual retry option
      return (
        <div className="rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 opacity-80">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>جاري معالجة الملف...</span>
          </div>
          {providerId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              disabled={retrying}
              onClick={handleRetry}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> إعادة المحاولة الآن
            </Button>
          )}
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Loader2 className="h-3 w-3 animate-spin" /> جاري تحميل الملف...
        </div>
      );
    }

    if (isError || !signedUrl) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span>تعذر فتح الملف</span>
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return renderMedia(signedUrl);
  };

  const renderMedia = (url: string) => {
    if (type === 'image' || type === 'sticker' || mime.startsWith('image/')) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt={caption || 'صورة'}
            className={`rounded-md object-cover ${type === 'sticker' ? 'max-h-32' : 'max-h-64'} w-auto`}
            loading="lazy"
          />
        </a>
      );
    }

    if (type === 'audio' || type === 'voice' || mime.startsWith('audio/')) {
      const audioType = mime.startsWith('audio/') ? mime : 'audio/ogg';
      return (
        <audio controls className="w-64 max-w-full" preload="metadata">
          <source src={url} type={audioType} />
          <source src={url} type="audio/ogg" />
          <source src={url} type="audio/mpeg" />
          <source src={url} type="audio/mp4" />
        </audio>
      );
    }

    if (type === 'video' || mime.startsWith('video/')) {
      return <video controls src={url} className="max-h-64 rounded-md" preload="metadata" />;
    }

    // Document / other
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download={fileName}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs border ${
          outbound ? 'border-white/30 bg-white/10' : 'border-emerald-300 bg-white'
        }`}
      >
        <FileText className="h-4 w-4" />
        <span className="truncate max-w-[180px]">{fileName}</span>
        <Download className="h-3.5 w-3.5" />
      </a>
    );
  };

  return (
    <div className="space-y-1.5">
      {mediaContent()}
      {caption && <div className="whitespace-pre-wrap break-words text-sm">{caption}</div>}
    </div>
  );
};

export default WhatsAppMediaMessage;
