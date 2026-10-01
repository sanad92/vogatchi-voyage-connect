const MUTE_STORAGE_KEY = 'vogatchi.sound-alerts.muted';

let audioContext: AudioContext | null = null;
let unlocked = false;

export type AlertSound = 'notification' | 'message';

export const isSoundMuted = (): boolean => {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const setSoundMuted = (muted: boolean): void => {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    /* storage unavailable — keep runtime behaviour only */
  }
  window.dispatchEvent(new CustomEvent('vogatchi-sound-mute-changed', { detail: { muted } }));
};

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
};

/** Browsers block audio until the user interacts with the page. */
export const unlockSoundAlerts = (): void => {
  if (unlocked) return;
  const ctx = getContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    unlocked = true;
  });
};

const playTone = (
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  peakGain: number
): void => {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};

const SOUND_PRESETS: Record<AlertSound, Array<{ frequency: number; offset: number; duration: number; gain: number }>> = {
  // Calm two-note chime for system notifications
  notification: [
    { frequency: 660, offset: 0, duration: 0.28, gain: 0.12 },
    { frequency: 880, offset: 0.13, duration: 0.34, gain: 0.1 },
  ],
  // Brighter, quicker ping for incoming customer messages
  message: [
    { frequency: 990, offset: 0, duration: 0.14, gain: 0.13 },
    { frequency: 1320, offset: 0.09, duration: 0.18, gain: 0.11 },
  ],
};

export const playAlertSound = (sound: AlertSound): void => {
  if (isSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;

  const start = () => {
    const now = ctx.currentTime + 0.01;
    SOUND_PRESETS[sound].forEach(({ frequency, offset, duration, gain }) => {
      playTone(ctx, frequency, now + offset, duration, gain);
    });
  };

  if (ctx.state === 'suspended') {
    void ctx.resume().then(start).catch(() => undefined);
    return;
  }
  start();
};

// Conversation currently open on screen; its inbound messages don't chime.
let activeConversationId: string | null = null;
export const setActiveConversation = (id: string | null) => { activeConversationId = id; };
export const getActiveConversation = () => activeConversationId;
