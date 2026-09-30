import { useCallback, useEffect, useState } from 'react';
import { isSoundMuted, setSoundMuted, unlockSoundAlerts } from '@/lib/soundAlerts';

/** Reads/writes the global sound-alert mute preference and keeps every consumer in sync. */
export const useSoundAlerts = () => {
  const [muted, setMuted] = useState<boolean>(() => isSoundMuted());

  useEffect(() => {
    const onChange = () => setMuted(isSoundMuted());
    window.addEventListener('vogatchi-sound-mute-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('vogatchi-sound-mute-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  // Browsers only allow audio after a real user interaction.
  useEffect(() => {
    const unlock = () => unlockSoundAlerts();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const toggleMuted = useCallback(() => {
    const next = !isSoundMuted();
    setSoundMuted(next);
    if (!next) unlockSoundAlerts();
  }, []);

  return { muted, toggleMuted };
};
