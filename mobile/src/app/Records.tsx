import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpLeft, BriefcaseBusiness, ChevronLeft, RefreshCw, Search, X } from 'lucide-react';
import { bookingStatusLabel } from '@safar-shared/bookingStatus';
import { customerDisplayName } from '@safar-shared/customerDisplayName';
import { normalizeCustomerPhone } from '@safar-shared/customerPhone';
import {
  canEditCustomerContact, getOverview, listBookings, listCustomers, updateCustomerContact,
  type Booking, type Customer, type CustomerContact, type ListPage,
} from './erp';

const numberFormat = new Intl.NumberFormat('ar-EG');
const dateFormat = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long',
});
const bookingTypes: Record<string, string> = {
  hotel: 'فندق', flight: 'طيران', transport: 'انتقالات', transfer: 'انتقالات',
  car_rental: 'تأجير سيارة', package: 'باقة', tour: 'رحلة', cruise: 'رحلة بحرية',
};

function bookingType(type: string) {
  return bookingTypes[type] ?? type;
}

export function RequestError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="panel state" role="alert">
      <p>{message}</p>
      <button type="button" className="outline" onClick={retry}>إعادة المحاولة</button>
    </div>
  );
}

function ScreenHeading({ title, date, refreshing, refresh }: {
  title: string;
  date?: string;
  refreshing: boolean;
  refresh: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        {date && <p className="section-date">{date}</p>}
        <h1>{title}</h1>
      </div>
      <button type="button" className="icon-button" onClick={refresh} disabled={refreshing} aria-label="تحديث">
        <RefreshCw aria-hidden="true" />
      </button>
    </div>
  );
}

export function OverviewScreen({ organizationId, navigate }: {
  organizationId: string;
  navigate: (section: 'bookings' | 'customers') => void;
}) {
  const query = useQuery({
    queryKey: ['overview', organizationId],
    queryFn: ({ signal }) => getOverview(organizationId, signal),
  });
  const [selected, setSelected] = useState<Booking | null>(null);

  return (
    <>
      <ScreenHeading title="نظرة عامة" date={dateFormat.format(new Date())} refreshing={query.isFetching}
        refresh={() => void query.refetch()} />
      {query.isPending ? (
        <p className="panel state" role="status">جارٍ تحميل البيانات…</p>
      ) : query.isError ? (
        <RequestError message="تعذّر تحميل البيانات." retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="stats" aria-label="ملخص المؤسسة">
            <div className="stat stat-dark">
              <span>حجوزات تبدأ اليوم</span><strong>{numberFormat.format(query.data.todayBookings)}</strong>
            </div>
            <button type="button" className="stat stat-light" onClick={() => navigate('customers')}>
              <span>العملاء النشطون</span><strong>{numberFormat.format(query.data.customers)}</strong>
              <ArrowUpLeft className="stat-arrow" aria-hidden="true" />
            </button>
          </div>
          <div className="list-heading">
            <h2>آخر الحجوزات</h2>
            <button type="button" className="link-button" onClick={() => navigate('bookings')}>عرض الكل</button>
          </div>
          {query.data.recent.length ? query.data.recent.map(item => (
            <BookingRow key={item.id} record={item} open={() => setSelected(item)} />
          )) : <p className="panel state">لا توجد حجوزات لعرضها.</p>}
        </>
      )}
      {selected && <BookingDetails record={selected} close={() => setSelected(null)} />}
    </>
  );
}

interface ListScreenProps<T> {
  organizationId: string;
  section: 'bookings' | 'customers';
  title: string;
  placeholder: string;
  empty: string;
  load: (organizationId: string, page: number, search: string, signal: AbortSignal) => Promise<ListPage<T>>;
  Row: (props: { record: T; open: () => void }) => ReactNode;
  Details: (props: { record: T; close: () => void; organizationId: string; onUpdated: (record: T) => void }) => ReactNode;
}

function ListScreen<T extends { id: string }>({
  organizationId, section, title, placeholder, empty, load, Row, Details,
}: ListScreenProps<T>) {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState({ term: '', page: 0 });
  const [selected, setSelected] = useState<T | null>(null);
  const queryClient = useQueryClient();
  const term = input.trim();
  const searching = term !== filter.term;

  useEffect(() => {
    if (!searching) return;
    const timer = window.setTimeout(() => setFilter({ term, page: 0 }), 250);
    return () => window.clearTimeout(timer);
  }, [searching, term]);

  const query = useQuery({
    queryKey: [section, organizationId, filter.term, filter.page],
    queryFn: ({ signal }) => load(organizationId, filter.page, filter.term, signal),
    enabled: !searching,
  });

  function changePage(delta: number) {
    setFilter(current => ({ ...current, page: current.page + delta }));
    window.scrollTo(0, 0);
  }

  return (
    <>
      <ScreenHeading title={title} refreshing={query.isFetching || searching} refresh={() => void query.refetch()} />
      <label className="search">
        <span className="sr-only">بحث</span>
        <Search aria-hidden="true" />
        <input type="search" dir="auto" value={input} maxLength={100}
          onChange={event => {
            const value = event.target.value;
            setInput(value);
            if (value.trim() === filter.term && filter.page) setFilter({ term: filter.term, page: 0 });
          }} placeholder={placeholder} />
      </label>
      {searching || query.isPending ? (
        <p className="panel state" role="status">جارٍ تحميل البيانات…</p>
      ) : query.isError ? (
        <RequestError message="تعذّر تحميل البيانات." retry={() => void query.refetch()} />
      ) : (
        <>
          {query.data.rows.length ? query.data.rows.map(record => (
            <Row key={record.id} record={record} open={() => setSelected(record)} />
          )) : <p className="panel state">{empty}</p>}
          {(filter.page > 0 || query.data.more) && (
            <nav className="pagination" aria-label="صفحات النتائج">
              <button className="outline" type="button" onClick={() => changePage(-1)} disabled={filter.page === 0}>السابق</button>
              <span>{numberFormat.format(filter.page + 1)}</span>
              <button className="outline" type="button" onClick={() => changePage(1)} disabled={!query.data.more}>التالي</button>
            </nav>
          )}
        </>
      )}
      {selected && <Details record={selected} close={() => setSelected(null)} organizationId={organizationId}
        onUpdated={record => {
          setSelected(record);
          void queryClient.invalidateQueries({ queryKey: [section, organizationId] });
        }} />}
    </>
  );
}

export function BookingsScreen({ organizationId }: { organizationId: string }) {
  return <ListScreen organizationId={organizationId} section="bookings" title="الحجوزات"
    placeholder="رقم الحجز أو اسم العميل" empty="لا توجد حجوزات مطابقة."
    load={listBookings} Row={BookingRow} Details={BookingDetails} />;
}

export function CustomersScreen({ organizationId }: { organizationId: string }) {
  return <ListScreen organizationId={organizationId} section="customers" title="العملاء"
    placeholder="الاسم أو رقم الهاتف أو البريد" empty="لا يوجد عملاء مطابقون."
    load={listCustomers} Row={CustomerRow} Details={CustomerDetails} />;
}

function BookingRow({ record, open }: { record: Booking; open: () => void }) {
  const statusClass = ['confirmed', 'completed'].includes(record.status ?? '') ? 'status-ok'
    : ['cancelled', 'canceled'].includes(record.status ?? '') ? 'status-off' : '';
  return (
    <button type="button" className="record" onClick={open}>
      <span className="record-icon"><BriefcaseBusiness aria-hidden="true" /></span>
      <span className="record-data">
        <strong>{customerDisplayName(record.customer_name) || record.booking_number}</strong>
        <small dir="auto">{record.booking_number} · {bookingType(record.booking_type)}</small>
      </span>
      <span className={`status ${statusClass}`}>{bookingStatusLabel(record.status)}</span>
    </button>
  );
}

function CustomerRow({ record, open }: { record: Customer; open: () => void }) {
  const name = customerDisplayName(record.name) || record.name;
  return (
    <button type="button" className="record" onClick={open}>
      <span className="record-icon customer-icon" aria-hidden="true">{name.slice(0, 1) || 'ع'}</span>
      <span className="record-data">
        <strong>{name}</strong>
        <small dir="auto">{record.phone || record.email || 'بيانات العميل'}</small>
      </span>
      <ChevronLeft className="chevron" aria-hidden="true" />
    </button>
  );
}

function BookingDetails({ record, close }: { record: Booking; close: () => void }) {
  return (
    <DetailsSheet title="تفاصيل الحجز" close={close}>
      <dl>
        <div><dt>رقم الحجز</dt><dd dir="auto">{record.booking_number}</dd></div>
        <div><dt>العميل</dt><dd>{customerDisplayName(record.customer_name) || '—'}</dd></div>
        <div><dt>الخدمة</dt><dd>{bookingType(record.booking_type)}</dd></div>
        <div><dt>الحالة</dt><dd>{bookingStatusLabel(record.status)}</dd></div>
        <div><dt>البداية</dt><dd dir="ltr">{record.start_date || '—'}</dd></div>
        <div><dt>النهاية</dt><dd dir="ltr">{record.end_date || '—'}</dd></div>
      </dl>
    </DetailsSheet>
  );
}

function CustomerDetails({ record, close, organizationId, onUpdated }: {
  record: Customer;
  close: () => void;
  organizationId: string;
  onUpdated: (record: Customer) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const name = customerDisplayName(record.name) || record.name;
  const permission = useQuery({
    queryKey: ['customer-edit-permission', organizationId],
    queryFn: ({ signal }) => canEditCustomerContact(organizationId, signal),
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const nextName = String(form.get('name') ?? '').trim();
    const nextPhone = String(form.get('phone') ?? '').trim();
    const nextEmail = String(form.get('email') ?? '').trim();
    const contact: CustomerContact = {};

    if (nextName !== name.trim()) {
      if (nextName.length < 2) return setError('الاسم يجب أن يكون حرفين على الأقل.');
      contact.name = nextName;
    }
    if (nextPhone !== (record.phone ?? '').trim()) {
      const normalizedPhone = normalizeCustomerPhone(nextPhone);
      if (!/^\+?[\d\s()-]+$/.test(nextPhone) || !/^\d{10,15}$/.test(normalizedPhone)) {
        return setError('أدخل رقم هاتف صحيحًا من 10 إلى 15 رقمًا.');
      }
      contact.phone = normalizedPhone;
    }
    if (nextEmail !== (record.email ?? '').trim()) {
      if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return setError('البريد الإلكتروني غير صحيح.');
      }
      contact.email = nextEmail.toLowerCase() || null;
    }
    if (!Object.keys(contact).length) {
      setEditing(false);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const updated = await updateCustomerContact(organizationId, record, contact);
      onUpdated(updated);
      setSaved(true);
      setEditing(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذّر حفظ بيانات العميل.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <DetailsSheet title={editing ? 'تعديل بيانات العميل' : 'بيانات العميل'} close={close} dismissible={!saving}>
      {editing ? (
        <form className="contact-form" onSubmit={save} noValidate>
          {error && <p className="notice error" role="alert">{error}</p>}
          <label>الاسم<input name="name" autoComplete="off" dir="auto" defaultValue={name} disabled={saving} /></label>
          <label>الهاتف<input name="phone" type="tel" dir="ltr" defaultValue={record.phone ?? ''} disabled={saving} /></label>
          <label>البريد الإلكتروني<input name="email" type="email" dir="ltr" defaultValue={record.email ?? ''} disabled={saving} /></label>
          <div className="contact-actions">
            <button type="submit" className="primary" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</button>
            <button type="button" className="outline" disabled={saving} onClick={() => setEditing(false)}>إلغاء</button>
          </div>
        </form>
      ) : (
        <>
          {saved && <p className="notice" role="status">تم حفظ بيانات العميل.</p>}
          <dl>
            <div><dt>الاسم</dt><dd>{name}</dd></div>
            <div><dt>الهاتف</dt><dd dir="ltr">{record.phone || '—'}</dd></div>
            <div><dt>البريد الإلكتروني</dt><dd dir="ltr">{record.email || '—'}</dd></div>
          </dl>
          {permission.data === true && !permission.isError && (
            <button type="button" className="outline contact-edit" onClick={() => {
              setError('');
              setSaved(false);
              setEditing(true);
            }}>تعديل بيانات التواصل</button>
          )}
        </>
      )}
    </DetailsSheet>
  );
}

function DetailsSheet({ title, close, children, dismissible = true }: {
  title: string;
  close: () => void;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const opener = useRef(document.activeElement);
  return (
    <Dialog.Root open onOpenChange={open => { if (!open && dismissible) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="sheet" aria-describedby={undefined} onCloseAutoFocus={event => {
          event.preventDefault();
          if (opener.current instanceof HTMLElement) opener.current.focus();
        }}>
          <header className="sheet-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="إغلاق" disabled={!dismissible}><X aria-hidden="true" /></Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
