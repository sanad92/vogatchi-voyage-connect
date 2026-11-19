import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Session } from '@supabase/supabase-js';
import { runtime } from '../runtime.generated';
import { erp } from './erp';
import { taskPushUuid } from './taskPushDetails';

const channelId = 'safar_tasks';
const supported = runtime.androidPushEnabled && Capacitor.getPlatform() === 'android';
type PushState = 'idle' | 'pending' | 'active' | 'blocked' | 'error';

function sessionId(session: Session) {
  try {
    const payload = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const value = JSON.parse(atob(payload)).session_id;
    return typeof value === 'string' && taskPushUuid.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function useAndroidTaskPush(session: Session | null | undefined, openTask: (id: string) => void) {
  const [state, setState] = useState<PushState>('idle');
  const [messageId, setMessageId] = useState<string | null>(null);
  const current = useRef(session);
  const registration = useRef<{ token: string; user: string } | null>(null);
  const pending = useRef<Promise<void>>(Promise.resolve());
  current.current = session;

  useEffect(() => {
    if (!supported) return;
    const readId = (data: Record<string, unknown> | undefined) =>
      typeof data?.notificationId === 'string' && taskPushUuid.test(data.notificationId) ? data.notificationId : null;
    const listeners = [
      PushNotifications.addListener('registration', ({ value }) => {
        const active = current.current;
        const authSession = active && sessionId(active);
        if (!active || !authSession) return;
        registration.current = { token: value, user: active.user.id };
        pending.current = pending.current.catch(() => {}).then(async () => {
          if (!current.current || sessionId(current.current) !== authSession) return;
          const { error } = await erp.from('mobile_push_devices').upsert({
            token: value, user_id: active.user.id, auth_session_id: authSession,
            registered_at: new Date().toISOString(),
          }).abortSignal(AbortSignal.timeout(5000));
          if (current.current && sessionId(current.current) === authSession) setState(error ? 'error' : 'active');
        }).catch(() => setState('error'));
      }),
      PushNotifications.addListener('registrationError', () => setState('error')),
      PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const id = readId(notification.data);
        if (id) openTask(id);
      }),
      PushNotifications.addListener('pushNotificationReceived', notification => {
        const id = readId(notification.data);
        if (id && current.current) setMessageId(id);
      }),
    ];
    void Promise.all(listeners).catch(() => setState('error'));
    return () => { for (const listener of listeners) void listener.then(handle => handle.remove()).catch(() => {}); };
  }, [openTask]);

  async function enable(interactive: boolean) {
    if (!supported || !current.current) return;
    if (interactive) setState('pending');
    try {
      let { receive } = await PushNotifications.checkPermissions();
      if (interactive && (receive === 'prompt' || receive === 'prompt-with-rationale')) {
        ({ receive } = await PushNotifications.requestPermissions());
      }
      if (!current.current) return;
      if (receive !== 'granted') {
        setState(receive === 'denied' ? 'blocked' : 'idle');
        return;
      }
      await PushNotifications.createChannel({
        id: channelId, name: 'مهام Safar ERP', importance: 4, visibility: -1, vibration: true,
      });
      setState('pending');
      await PushNotifications.register();
    } catch {
      setState('error');
    }
  }

  const loggedInUser = session?.user.id;
  const activeSession = session && sessionId(session);
  useEffect(() => {
    if (loggedInUser && activeSession) void enable(false);
    // Registration is scoped to the sign-in, not every JWT refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUser, activeSession]);

  const detach = useCallback(async () => {
    if (!supported) return;
    current.current = null;
    const last = registration.current;
    registration.current = null;
    setState('idle');
    setMessageId(null);
    await pending.current.catch(() => {});
    const deadline = AbortSignal.timeout(3500);
    const waitForDeadline = new Promise<void>(resolve =>
      deadline.addEventListener('abort', () => resolve(), { once: true }),
    );
    const revoke = Promise.allSettled([
      PushNotifications.unregister(),
      last ? erp.from('mobile_push_devices').delete().eq('token', last.token).eq('user_id', last.user)
        .abortSignal(deadline) : Promise.resolve(),
    ]);
    await Promise.race([revoke, waitForDeadline]);
  }, []);

  return {
    supported, state, messageId, enable: () => void enable(true), detach,
    dismiss: () => setMessageId(null),
  };
}
