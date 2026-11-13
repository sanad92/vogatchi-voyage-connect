import { buildWalletStatement } from '@/lib/walletStatement';
import type { PartyWalletMovement } from '@/lib/partyWalletMovements';
import { downloadBlob, pagesToPdfBlob } from './htmlToPdf';

interface Options {
  kind: 'customer' | 'supplier';
  partyName: string;
  organizationName: string;
  from: string;
  through: string;
  language: 'ar' | 'en';
  movements: PartyWalletMovement[];
  translate: (label: string) => string;
}

const styles = `
  .wallet-statement {
    width: 794px; height: 1123px; padding: 40px 38px 32px;
    box-sizing: border-box; display: flex; flex-direction: column;
    color: #192b43; background: white; font: 13px/1.55 "Noto Sans Arabic", Tahoma, Arial, sans-serif;
  }
  .wallet-statement * { box-sizing: border-box; }
  .wallet-statement header { border-bottom: 2px solid #20666a; padding-bottom: 14px; margin-bottom: 16px; }
  .wallet-statement h1 { font-size: 24px; font-weight: 700; margin: 3px 0 7px; }
  .wallet-statement h2 { font-size: 15px; font-weight: 700; margin: 14px 0 6px; }
  .wallet-statement p { margin: 3px 0; overflow-wrap: anywhere; }
  .wallet-statement .meta { color: #435870; }
  .wallet-statement main { flex: 1; min-height: 0; }
  .wallet-statement footer { border-top: 1px solid #c5d3df; margin-top: 12px; padding-top: 7px; color: #435870; }
  .wallet-statement table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 10px; }
  .wallet-statement th, .wallet-statement td {
    border: 1px solid #d4dfe6; padding: 7px 8px; text-align: start;
    vertical-align: top; overflow-wrap: anywhere;
  }
  .wallet-statement .identifiers { white-space: pre-line; }
  .wallet-statement th { background: #e8f2f2; font-weight: 700; }
  .wallet-statement tr:nth-child(even) td { background: #f5f8fb; }
`;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, value?: string) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  return node;
}

function table(headers: string[], widths?: number[]) {
  const node = element('table');
  if (widths) {
    const columns = element('colgroup');
    for (const width of widths) {
      const column = element('col');
      column.style.width = `${width}%`;
      columns.append(column);
    }
    node.append(columns);
  }
  const header = node.createTHead().insertRow();
  for (const label of headers) {
    const cell = element('th', label);
    cell.scope = 'col';
    header.append(cell);
  }
  return { node, body: node.createTBody() };
}

function addRow(body: HTMLTableSectionElement, values: string[]) {
  const row = body.insertRow();
  for (const value of values) {
    const cell = row.insertCell();
    const text = element('bdi', value);
    cell.append(text);
  }
  return row;
}

export async function downloadWalletStatement(options: Options) {
  const { from, through, movements, partyName, organizationName, kind, language, translate: t } = options;
  const statement = buildWalletStatement(movements, from, through);
  const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
  const date = (day: string) => formatDate.format(new Date(day));
  const money = (amount: number, currency: string) => `${number.format(amount)} ${currency}`;
  const host = element('div');
  host.dataset.noTranslate = '';
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', top: '0', left: '-10000px', pointerEvents: 'none' });
  host.append(element('style', styles));
  document.body.append(host);

  const pages: HTMLElement[] = [];
  const footers: HTMLElement[] = [];
  function addPage() {
    const page = element('article');
    page.className = 'wallet-statement';
    page.lang = language;
    page.dir = language === 'ar' ? 'rtl' : 'ltr';
    const header = element('header');
    const organization = element('p', organizationName);
    organization.dir = 'auto';
    header.append(organization, element('h1', t(kind === 'customer' ? 'كشف محفظة العميل' : 'كشف محفظة المورد')));
    const meta = element('p');
    meta.className = 'meta';
    const period = element('bdi', `${date(from)} - ${date(through)}`);
    period.dir = 'ltr';
    meta.append(element('bdi', partyName), ' · ', period);
    header.append(meta);
    const main = element('main');
    const footer = element('footer', '0 / 0');
    page.append(header, main, footer);
    host.append(page);
    pages.push(page);
    footers.push(footer);
    return main;
  }

  try {
    let main = addPage();
    await document.fonts.ready;
    if (statement.totals.length) {
      const heading = element('h2', t('رصيد الاسترداد حسب العملة'));
      main.append(heading);
      const headers = ['العملة', 'رصيد أول الفترة', 'إضافات الرصيد', 'تسويات الرصيد', 'رصيد آخر الفترة'].map(t);
      let summary = table(headers);
      main.append(summary.node);
      for (const row of statement.totals) {
        const values = [row.currency, ...[row.opening, row.added, row.applied, row.closing].map(value => number.format(value / 100))];
        if (addRow(summary.body, values).getBoundingClientRect().bottom > main.getBoundingClientRect().bottom) {
          summary.body.lastElementChild?.remove();
          main = addPage();
          main.append(element('h2', t('رصيد الاسترداد حسب العملة')));
          summary = table(headers);
          main.append(summary.node);
          addRow(summary.body, values);
        }
      }
    }

    if (statement.undatedCount) {
      const note = element('p', `${t('حركات بدون تاريخ خارج الكشف')}: ${statement.undatedCount.toLocaleString(locale)}`);
      note.className = 'meta';
      main.append(note);
      if (note.getBoundingClientRect().bottom > main.getBoundingClientRect().bottom) addPage().append(note);
      main = note.parentElement!;
    }
    if (!statement.rows.length) {
      const message = element('p', t('لا توجد حركات في الفترة المحددة'));
      main.append(message);
      if (message.getBoundingClientRect().bottom > main.getBoundingClientRect().bottom) addPage().append(message);
    } else {
      const headers = ['التاريخ', 'الحركة', 'المبلغ', 'أثرها على رصيد الاسترداد', 'حركة الأموال', 'المستند والمرجع'].map(t);
      const widths = [14, 19, 14, 16, 13, 24];
      let detail = table(headers, widths);
      main.append(detail.node);
      for (const row of statement.rows) {
        const linkedDocuments = row.links?.filter(link => link.kind !== 'refund').map(link => link.label) ?? [];
        const documents = [...new Set([row.document, ...linkedDocuments, row.reference].filter(Boolean))];
        const values = [
          date(row.day), t(row.label), money(row.amount, row.currency),
          row.balanceDelta ? `${row.balanceDelta > 0 ? '+' : '-'}${money(Math.abs(row.balanceDelta), row.currency)}` : '—',
          row.cashDirection ? t(row.cashDirection === 'in' ? 'وارد' : 'صادر') : '—',
          documents.join('\n') || '—',
        ];
        const renderRow = () => {
          const rendered = addRow(detail.body, values);
          rendered.cells[5].className = 'identifiers';
          return rendered;
        };
        const renderedRow = renderRow();
        if (renderedRow.getBoundingClientRect().bottom > main.getBoundingClientRect().bottom) {
          renderedRow.remove();
          if (!detail.body.rows.length) detail.node.remove();
          main = addPage();
          detail = table(headers, widths);
          main.append(detail.node);
          renderRow();
        }
      }
    }

    footers.forEach((footer, index) => {
      const pageNumber = element('bdi', `${index + 1} / ${pages.length}`);
      pageNumber.dir = 'ltr';
      footer.replaceChildren(t('صفحة'), ' ', pageNumber);
    });
    const blob = await pagesToPdfBlob(pages);
    downloadBlob(blob, `safar-${kind}-wallet-${from}-${through}.pdf`);
  } finally {
    host.remove();
  }
}
