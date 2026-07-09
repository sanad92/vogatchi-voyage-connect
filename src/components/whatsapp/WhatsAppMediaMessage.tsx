import React from 'react';
import { FileText, Download, MapPin, Loader2, Image as ImageIcon } from 'lucide-react';
import { useSignedMediaUrl } from '@/hooks/useSignedMediaUrl';
import { Button } from '@/components/ui/button';

interface Props {
  message: any;
  outbound: boolean;
}

const formatBytes = (n?: number) => (n ? `${(n / 1024).toFixed(1)} KB` : '');

export const WhatsAppMediaMessage: React.FC<Props> = ({ message, outbound }) => {
  const path = message.media_storage_path as string | null | undefined;
  const { data: signedUrl, isLoading } = useSignedMediaUrl(path);
  const type = message.message_type as string;
  const rawMime = (message.media_mime_type as string) || '';
  const mime = rawMime.split(';')[0].trim().toLowerCase();
  const caption = message.media_caption || (type === 'text' ? null : message.content);
  const fileName = message.media_file_name || 'file';

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

  const mediaContent = () => {
    if (!path) {
      const isAudio = type === 'audio' || type === 'voice';
      return (
        <div className="text-xs opacity-70 italic">
          {isAudio
            ? 'جاري معالجة الملف الصوتي... حدّث بعد لحظات'
            : `[${type}] ${caption || 'الملف غير متاح'}`}
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
    if (!signedUrl) {
      return <div className="text-xs opacity-70">تعذر فتح الملف</div>;
    }

    if (type === 'image' || type === 'sticker' || mime.startsWith('image/')) {
      return (
        <a href={signedUrl} target="_blank" rel="noreferrer" className="block">
          <img
            src={signedUrl}
            alt={caption || 'صورة'}
            className={`rounded-md object-cover ${type === 'sticker' ? 'max-h-32' : 'max-h-64'} w-auto`}
            loading="lazy"
          />
        </a>
      );
    }

    if (type === 'audio' || type === 'voice' || mime.startsWith('audio/')) {
      return <audio controls src={signedUrl} className="w-64 max-w-full" preload="metadata" />;
    }

    if (type === 'video' || mime.startsWith('video/')) {
      return <video controls src={signedUrl} className="max-h-64 rounded-md" preload="metadata" />;
    }

    // Document / other
    return (
      <a
        href={signedUrl}
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
