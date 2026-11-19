import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { BriefcaseBusiness, ChevronDown, ExternalLink, House, UserRound, UsersRound } from 'lucide-react';
import { getAuthErrorMessage } from '@safar-shared/authErrorMessage';
import {
  closeBrowserSessionActivity,
  getBrowserSessionActivityKey,
  startBrowserSessionActivity,
  watchBrowserSessionActivity,
} from '@safar-shared/browserSessionActivity';
import safarMark from '../assets/safar-mark.webp';
import { endMobileSession, erp, listOrganizations } from './erp';
import { BookingsScreen, CustomersScreen, OverviewScreen, RequestError } from './Records';
import { AndroidUpdateNotice } from './AndroidUpdateNotice';
import { useAndroidTaskPush } from './taskPush';
import { TaskPushSheet } from './TaskPushSheet';

type Section = 'overview' | 'bookings' | 'customers' | 'account';
type WebPath = '/forgot-password' | '/login';

const tabs = [
  { id: 'overview', label: 'الرئيسية', Icon: House },
  { id: 'bookings', label: 'الحجوزات', Icon: BriefcaseBusiness },
  { id: 'customers', label: 'العملاء', Icon: UsersRound },
  { id: 'account', label: 'حسابي', Icon: UserRound },
] as const;
const roleNames: Record<string, string> = { owner: 'مالك', admin: 'أدمن', manager: 'مدير', agent: 'موظف', viewer: 'مشاهد' };

function Brand({ compact = false }: { compact?: boolean }) {
  const size = compact ? 24 : 34;
  return (
    <div className={compact ? 'topbar-brand' : 'login-brand'}>
      <span className="brand-mark"><img src={safarMark} alt="" width={size} height={size} /></span>
      <span className="wordmark" dir="ltr">Safar <b>ERP</b></span>
    </div>
  );
}

export function MobileApp() {
  const [session, setSession] = useState<Session | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [taskNoticeId, setTaskNoticeId] = useState<string | null>(null);
  const openTask = useCallback((id: string) => setTaskNoticeId(id), []);
  const push = useAndroidTaskPush(session, openTask);
  const detachTaskPush = push.detach;
  const signingOut = useRef(false);
  const sessionKey = session && getBrowserSessionActivityKey(session.access_token);

  useEffect(() => {
    const { data } = erp.auth.onAuthStateChange((_, next) => {
      if (!signingOut.current) setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) window.dispatchEvent(new Event('focus'));
    });
    return () => { void listener.then(handle => handle.remove()); };
  }, []);

  const signOut = useCallback(async (idle: boolean) => {
    if (signingOut.current) return;
    signingOut.current = true;
    setBusy(true);
    setError('');
    setNotice(idle ? 'انتهت الجلسة بسبب عدم الاستخدام. سجّل الدخول للمتابعة.' : '');
    if (sessionKey) closeBrowserSessionActivity(sessionKey);
    setTaskNoticeId(null);
    setSession(null);

    await detachTaskPush();
    const ended = await endMobileSession();
    if (!idle && !ended) setNotice('تم إغلاق الحساب على هذا الجهاز.');
    signingOut.current = false;
    setBusy(false);
  }, [sessionKey, detachTaskPush]);

  useEffect(() => {
    if (!sessionKey) return;
    startBrowserSessionActivity(sessionKey);
    return watchBrowserSessionActivity(sessionKey, () => void signOut(true));
  }, [sessionKey, signOut]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get('email')).trim().toLowerCase();
    const password = String(fields.get('password'));
    const passwordField = form.elements.namedItem('password') as HTMLInputElement;
    setBusy(true);
    setNotice('');
    setError('');

    try {
      const { error } = await erp.auth.signInWithPassword({ email, password });
      if (error) setError(getAuthErrorMessage(error));
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      passwordField.value = '';
      setBusy(false);
    }
  }

  async function openWeb(path: WebPath) {
    try {
      await Browser.open({ url: `https://safarerp.com${path}` });
    } catch {
      setNotice('تعذّر فتح المتصفح.');
    }
  }

  if (session === undefined) {
    return (
      <main className="loading-frame" role="status">
        <img src={safarMark} alt="Safar ERP" width="50" height="50" />
        <span>جارٍ فتح التطبيق…</span>
      </main>
    );
  }

  if (session) {
    return (
      <Workspace key={sessionKey || session.user.id} user={session.user} notice={notice}
        push={push} taskNoticeId={taskNoticeId} closeTask={() => setTaskNoticeId(null)} openTask={openTask}
        signOut={() => void signOut(false)} openWeb={() => void openWeb('/login')} />
    );
  }

  return (
    <main className="login-screen">
      <section className="login-content" aria-labelledby="login-heading">
        <Brand />
        <AndroidUpdateNotice />
        <div className="login-heading">
          <h1 id="login-heading">تسجيل الدخول</h1>
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}
        {error && <p className="notice error" role="alert">{error}</p>}
        <form onSubmit={signIn} className="login-form">
          <label htmlFor="email">بريد العمل</label>
          <input id="email" name="email" type="email" dir="ltr" autoComplete="username" inputMode="email"
            autoCapitalize="none" required placeholder="name@company.com" />
          <label htmlFor="password">كلمة المرور</label>
          <input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" required />
          <button className="primary" type="submit" disabled={busy}>{busy ? 'جارٍ الانتظار…' : 'تسجيل الدخول'}</button>
        </form>
        <button className="link-button" type="button" onClick={() => void openWeb('/forgot-password')}>نسيت كلمة المرور؟</button>
      </section>
    </main>
  );
}

interface WorkspaceProps {
  user: User;
  notice: string;
  signOut: () => void;
  openWeb: () => void;
  push: ReturnType<typeof useAndroidTaskPush>;
  taskNoticeId: string | null;
  closeTask: () => void;
  openTask: (id: string) => void;
}

function Workspace(props: WorkspaceProps) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={queryClient}><WorkspaceContent {...props} /></QueryClientProvider>;
}

function WorkspaceContent({ user, notice, signOut, openWeb, push, taskNoticeId, closeTask, openTask }: WorkspaceProps) {
  const [section, setSection] = useState<Section>('overview');
  const [selectedOrganizationId, setOrganizationId] = useState('');
  const memberships = useQuery({
    queryKey: ['organizations', user.id],
    queryFn: ({ signal }) => listOrganizations(user.id, signal),
  });
  const organizations = memberships.isError ? [] : memberships.data ?? [];
  const organization = organizations.find(item => item.id === selectedOrganizationId) ?? organizations[0];
  const email = user.email ?? '';

  function selectSection(next: Section) {
    setSection(next);
    window.scrollTo(0, 0);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand compact />
        {organization && (
          <label className="org-select">
            <span className="sr-only">المؤسسة النشطة</span>
            <select value={organization.id} onChange={event => {
              setOrganizationId(event.target.value);
              selectSection('overview');
            }}>
              {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
        )}
      </header>

      <main className="content">
        <AndroidUpdateNotice />
        {push.messageId && (
          <aside className="notice" aria-label="مهمة جديدة">
            <p>تم إسناد مهمة إليك.</p>
            <button type="button" className="link-button" onClick={() => {
              if (push.messageId) openTask(push.messageId);
              push.dismiss();
            }}>فتح المهمة</button>
          </aside>
        )}
        {notice && <p className="notice" role="status">{notice}</p>}
        {section === 'account' ? (
          <>
            <div className="section-heading"><h1>حسابي</h1></div>
            <section className="panel account-panel" aria-label="بيانات الحساب">
              <div className="account-avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</div>
              <div className="account-identity">
                <strong dir="ltr">{email}</strong>
                {organization && <p>{organization.name} · {roleNames[organization.role] ?? organization.role}</p>}
              </div>
            </section>
            <section className="panel account-actions" aria-label="خيارات الحساب">
              {push.supported && (
                <button type="button" onClick={push.enable} disabled={push.state === 'pending' || push.state === 'active'}>
                  <span>{push.state === 'active' ? 'إشعارات المهام مفعّلة' :
                    push.state === 'pending' ? 'جارٍ تفعيل الإشعارات…' : 'تفعيل إشعارات المهام'}</span>
                </button>
              )}
              <button type="button" onClick={openWeb}><span>فتح نسخة الويب</span><ExternalLink aria-hidden="true" /></button>
              <button type="button" className="danger" onClick={signOut}>تسجيل الخروج</button>
            </section>
            {push.state === 'blocked' && <p className="notice" role="status">اسمح لإشعارات Safar ERP من إعدادات أندرويد.</p>}
            {push.state === 'error' && <p className="notice error" role="alert">تعذّر تفعيل إشعارات المهام. حاول مرة أخرى.</p>}
          </>
        ) : memberships.isPending ? (
          <p className="panel state" role="status">جارٍ تحميل مؤسساتك…</p>
        ) : memberships.isError ? (
          <RequestError message="تعذّر تحميل مؤسساتك." retry={() => void memberships.refetch()} />
        ) : !organization ? (
          <div className="panel state">
            <h1>لا توجد مؤسسة نشطة</h1>
            <p>راجع عضويتك مع مسؤول مؤسستك.</p>
            <button type="button" className="outline" onClick={() => selectSection('account')}>حسابي</button>
          </div>
        ) : (
          <div key={`${organization.id}:${section}`}>
            {section === 'overview' && <OverviewScreen organizationId={organization.id} navigate={selectSection} />}
            {section === 'bookings' && <BookingsScreen organizationId={organization.id} />}
            {section === 'customers' && <CustomersScreen organizationId={organization.id} />}
          </div>
        )}
      </main>

      <nav className="bottom-nav" aria-label="القائمة الرئيسية">
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} type="button" className={section === id ? 'current' : undefined}
            aria-current={section === id ? 'page' : undefined} onClick={() => selectSection(id)}>
            <span><Icon aria-hidden="true" /></span>{label}
          </button>
        ))}
      </nav>
      {taskNoticeId && <TaskPushSheet id={taskNoticeId} userId={user.id} close={closeTask} />}
    </div>
  );
}
