import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { runtime } from '../runtime.generated';

type AndroidUpdate = { versionCode: number; apkUrl: string };

export function readAndroidUpdate(data: unknown, url: string, packageId: string, installed: number): AndroidUpdate | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.applicationId !== packageId || typeof record.versionCode !== 'number' ||
      !Number.isInteger(record.versionCode) || record.versionCode <= installed ||
      record.versionCode > 2100000000 || typeof record.apkUrl !== 'string') return null;
  try {
    const origin = new URL(url);
    const apk = new URL(record.apkUrl, origin);
    if (origin.protocol !== 'https:' || apk.origin !== origin.origin ||
        apk.username || apk.password || !apk.pathname.endsWith('.apk')) return null;
    return { versionCode: record.versionCode, apkUrl: apk.href };
  } catch {
    return null;
  }
}

export function AndroidUpdateNotice() {
  const [update, setUpdate] = useState<AndroidUpdate | null>(null);
  const [downloadFailed, setDownloadFailed] = useState(false);
  useEffect(() => {
    const manifest: string | null = runtime.androidUpdateManifestUrl;
    if (!manifest || Capacitor.getPlatform() !== 'android') return;
    let stopped = false;
    let checking = false;
    async function check(url: string) {
      if (checking) return;
      checking = true;
      try {
        const app = await App.getInfo();
        const installed = Number(app.build);
        if (!Number.isSafeInteger(installed) || installed < 1) return;
        const reply = await CapacitorHttp.get({
          url, responseType: 'json', disableRedirects: true, connectTimeout: 5000, readTimeout: 5000,
        });
        if (!stopped && reply.status === 200) setUpdate(readAndroidUpdate(reply.data, url, app.id, installed));
      } catch {
        // Checking for an update should never block access to the ERP.
      } finally {
        checking = false;
      }
    }
    void check(manifest);
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && !stopped) void check(manifest);
    });
    return () => {
      stopped = true;
      void listener.then(handle => handle.remove()).catch(() => {});
    };
  }, []);

  if (!update) return null;
  return (
    <aside className="notice" aria-label="تحديث التطبيق">
      <p>في إصدار أحدث من Safar ERP.</p>
      <button type="button" className="link-button" onClick={() => {
        setDownloadFailed(false);
        void Browser.open({ url: update.apkUrl }).catch(() => setDownloadFailed(true));
      }}>تنزيل التحديث</button>
      {downloadFailed && <p role="alert">تعذّر فتح رابط التنزيل. حاول مرة أخرى.</p>}
    </aside>
  );
}
