import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { Session } from '@supabase/supabase-js';
import { getAuthErrorMessage } from '@safar-shared/authErrorMessage';
import { bookingStatusLabel } from '@safar-shared/bookingStatus';
import { customerDisplayName } from '@safar-shared/customerDisplayName';
import {
  closeBrowserSessionActivity,
  getBrowserSessionActivityKey,
  startBrowserSessionActivity,
  watchBrowserSessionActivity,
} from '@safar-shared/browserSessionActivity';
import {
  type Booking, type Customer, type Organization, type Overview,
  endMobileSession, erp, getOverview, listBookings, listCustomers, listOrganizations,
} from './erp';

type Section = 'overview' | 'bookings' | 'customers' | 'account';
const tabs = [
  { id: 'overview', label: 'الرئيسية', icon: 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z' },
  { id: 'bookings', label: 'الحجوزات', icon: 'M4 8h16v13H4zM8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M4 13h16M10 13v2h4v-2' },
  { id: 'customers', label: 'العملاء', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M22 21v-2a4 4 0 0 0-3-3.9M16 4.1a4 4 0 0 1 0 7.8' },
  { id: 'account', label: 'حسابي', icon: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0' },
] as const;
const roleNames: Record<string, string> = { owner: 'مالك', admin: 'أدمن', manager: 'مدير', agent: 'موظف', viewer: 'مشاهد' };
const bookingTypes: Record<string, string> = {
  hotel: 'فندق', flight: 'طيران', transport: 'انتقالات', transfer: 'انتقالات',
  car_rental: 'تأجير سيارة', package: 'باقة', tour: 'رحلة', cruise: 'رحلة بحرية',
};

@Component({
  selector: 'safar-mobile',
  imports: [FormsModule, DatePipe, DecimalPipe, NgTemplateOutlet],
  templateUrl: './mobile-app.html',
  styleUrl: './mobile-app.css',
})
export class MobileApp {
  private readonly destroyRef = inject(DestroyRef);
  private signingOut = false;
  private readonly session = signal<Session | null>(null);
  readonly user = computed(() => this.session()?.user.id ?? null);
  private readonly sessionKey = computed(() => {
    const accessToken = this.session()?.access_token;
    return accessToken ? getBrowserSessionActivityKey(accessToken) : null;
  });
  readonly emailAddress = computed(() => this.session()?.user.email ?? '');
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly authError = signal('');
  readonly notice = signal('');
  readonly organizations = signal<Organization[]>([]);
  readonly organizationId = signal('');
  readonly organization = computed(() => this.organizations().find(org => org.id === this.organizationId()));
  readonly membershipLoading = signal(false);
  readonly membershipError = signal('');
  private readonly membershipVersion = signal(0);
  readonly section = signal<Section>('overview');
  readonly filtered = signal('');
  readonly page = signal(0);
  readonly more = signal(false);
  readonly overview = signal<Overview | null>(null);
  readonly bookings = signal<Booking[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly selectedBooking = signal<Booking | null>(null);
  readonly selectedCustomer = signal<Customer | null>(null);
  readonly dataLoading = signal(false);
  readonly dataError = signal('');
  private readonly dataVersion = signal(0);
  readonly tabs = tabs;
  readonly roleNames = roleNames;
  readonly bookingTypes = bookingTypes;
  readonly bookingStatus = bookingStatusLabel;
  readonly displayName = customerDisplayName;
  readonly now = new Date();
  email = '';
  password = '';

  constructor() {
    const { data } = erp.auth.onAuthStateChange((_, session) => {
      if (this.signingOut) return;
      if (this.user() !== (session?.user.id ?? null)) this.clearOrganization();
      this.session.set(session);
      this.ready.set(true);
    });
    this.destroyRef.onDestroy(() => data.subscription.unsubscribe());

    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) window.dispatchEvent(new Event('focus'));
      });
      this.destroyRef.onDestroy(() => void listener.then(handle => handle.remove()));
    }

    effect(onCleanup => {
      const key = this.sessionKey();
      if (!key) return;
      startBrowserSessionActivity(key);
      onCleanup(watchBrowserSessionActivity(key, () => void this.signOut(true)));
    });

    effect(onCleanup => {
      const id = this.user();
      this.membershipVersion();
      if (!id) return;

      const control = new AbortController();
      onCleanup(() => control.abort());
      this.membershipLoading.set(true);
      this.membershipError.set('');
      void listOrganizations(id, control.signal).then(organizations => {
        if (control.signal.aborted) return;
        this.organizations.set(organizations);
        this.organizationId.update(current => organizations.some(item => item.id === current)
          ? current : organizations[0]?.id ?? '');
      }).catch(() => {
        if (!control.signal.aborted) this.membershipError.set('تعذّر تحميل مؤسساتك.');
      }).finally(() => {
        if (!control.signal.aborted) this.membershipLoading.set(false);
      });
    });

    effect(onCleanup => {
      const org = this.organization();
      const section = this.section();
      const page = this.page();
      const search = this.filtered();
      this.dataVersion();
      if (!org || !this.user() || section === 'account') return;

      const control = new AbortController();
      this.dataLoading.set(true);
      this.dataError.set('');
      const timer = window.setTimeout(() => {
        void this.loadSection(section, org.id, page, search, control.signal);
      }, search ? 250 : 0);
      onCleanup(() => {
        clearTimeout(timer);
        control.abort();
      });
    });
  }

  private async loadSection(section: Exclude<Section, 'account'>, orgId: string, page: number, search: string, signal: AbortSignal) {
    try {
      if (section === 'overview') {
        const result = await getOverview(orgId, signal);
        if (!signal.aborted) this.overview.set(result);
      } else if (section === 'bookings') {
        const result = await listBookings(orgId, page, search, signal);
        if (!signal.aborted) {
          this.bookings.set(result.rows);
          this.more.set(result.more);
        }
      } else {
        const result = await listCustomers(orgId, page, search, signal);
        if (!signal.aborted) {
          this.customers.set(result.rows);
          this.more.set(result.more);
        }
      }
    } catch {
      if (!signal.aborted) this.dataError.set('تعذّر تحميل البيانات. حاول مرة أخرى.');
    } finally {
      if (!signal.aborted) this.dataLoading.set(false);
    }
  }

  async signIn() {
    if (this.busy()) return;
    this.notice.set('');
    this.authError.set('');
    this.busy.set(true);
    try {
      const { error } = await erp.auth.signInWithPassword({ email: this.email.trim().toLowerCase(), password: this.password });
      if (error) this.authError.set(getAuthErrorMessage(error));
    } catch (error) {
      this.authError.set(getAuthErrorMessage(error));
    } finally {
      this.password = '';
      this.busy.set(false);
    }
  }

  async signOut(idle = false) {
    if (this.busy()) return;
    this.busy.set(true);
    this.signingOut = true;
    const key = this.sessionKey();
    if (key) closeBrowserSessionActivity(key);
    this.session.set(null);
    this.clearOrganization();
    const ended = await endMobileSession();
    if (idle) this.notice.set('انتهت الجلسة بسبب عدم الاستخدام. سجّل الدخول للمتابعة.');
    else if (!ended) this.notice.set('تم إغلاق الحساب في التطبيق.');
    this.signingOut = false;
    this.busy.set(false);
  }

  private clearOrganization() {
    this.organizations.set([]);
    this.organizationId.set('');
    this.membershipError.set('');
    this.membershipLoading.set(false);
    this.selectSection('overview');
  }

  retryOrganizations() { this.membershipVersion.update(n => n + 1); }
  refresh() { this.dataVersion.update(n => n + 1); }

  selectOrganization(id: string) {
    if (id === this.organizationId() || !this.organizations().some(org => org.id === id)) return;
    this.organizationId.set(id);
    this.selectSection('overview');
  }

  selectSection(section: Section) {
    this.section.set(section);
    this.filtered.set('');
    this.page.set(0);
    this.more.set(false);
    this.overview.set(null);
    this.bookings.set([]);
    this.customers.set([]);
    this.selectedBooking.set(null);
    this.selectedCustomer.set(null);
  }

  search(value: string) {
    this.page.set(0);
    this.more.set(false);
    this.filtered.set(value);
  }

  changePage(delta: number) {
    this.page.update(page => Math.max(0, page + delta));
    window.scrollTo({ top: 0 });
  }

  async openWeb(path: '/' | '/forgot-password' | '/login' = '/') {
    try {
      await Browser.open({ url: `https://safarerp.com${path}` });
    } catch {
      this.notice.set('تعذّر فتح المتصفح.');
    }
  }
}
