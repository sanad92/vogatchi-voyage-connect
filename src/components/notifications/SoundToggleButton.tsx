import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSoundAlerts } from '@/hooks/useSoundAlerts';
import { playAlertSound } from '@/lib/soundAlerts';

const SoundToggleButton = () => {
  const { muted, toggleMuted } = useSoundAlerts();

  const handleClick = () => {
    const wasMuted = muted;
    toggleMuted();
    if (wasMuted) {
      // Confirm audio works right after enabling
      setTimeout(() => playAlertSound('notification'), 80);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          aria-label={muted ? 'تشغيل التنبيهات الصوتية' : 'كتم التنبيهات الصوتية'}
        >
          {muted ? (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {muted ? 'التنبيهات الصوتية مكتومة' : 'التنبيهات الصوتية مفعّلة'}
      </TooltipContent>
    </Tooltip>
  );
};

export default SoundToggleButton;
