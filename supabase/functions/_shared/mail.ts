// Minimal IMAP (TLS) + SMTP (implicit TLS, port 465) clients and credential crypto.
const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------- credential encryption ----------
async function cryptoKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('EMAIL_CREDENTIALS_KEY');
  if (!raw) throw new Error('EMAIL_CREDENTIALS_KEY missing');
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(raw));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const b64 = (u: Uint8Array) => {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(), enc.encode(plain)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64(out);
}
export async function decryptSecret(stored: string): Promise<string> {
  const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.subarray(0, 12) }, await cryptoKey(), buf.subarray(12));
  return dec.decode(pt);
}
export const toBase64 = b64;

// ---------- buffered TLS reader ----------
class Wire {
  buf = new Uint8Array(0);
  constructor(public conn: Deno.TlsConn) {}
  async more() {
    const chunk = new Uint8Array(65536);
    const n = await this.conn.read(chunk);
    if (n === null) throw new Error('Connection closed by server');
    const next = new Uint8Array(this.buf.length + n);
    next.set(this.buf); next.set(chunk.subarray(0, n), this.buf.length);
    this.buf = next;
  }
  async line(): Promise<string> {
    for (;;) {
      for (let i = 0; i + 1 < this.buf.length; i++) {
        if (this.buf[i] === 13 && this.buf[i + 1] === 10) {
          const l = dec.decode(this.buf.subarray(0, i));
          this.buf = this.buf.slice(i + 2);
          return l;
        }
      }
      await this.more();
    }
  }
  async bytes(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) await this.more();
    const out = this.buf.slice(0, n);
    this.buf = this.buf.slice(n);
    return out;
  }
  async write(s: string | Uint8Array) {
    const data = typeof s === 'string' ? enc.encode(s) : s;
    let off = 0;
    while (off < data.length) off += await this.conn.write(data.subarray(off));
  }
  close() { try { this.conn.close(); } catch { /* ignore */ } }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms))]);
}

// ---------- IMAP ----------
export interface ImapItem { text: string; literals: Uint8Array[] }
const q = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export class Imap {
  private w!: Wire;
  private n = 0;
  static async connect(host: string, port: number): Promise<Imap> {
    const im = new Imap();
    const conn = await withTimeout(Deno.connectTls({ hostname: host, port }), 15000, 'IMAP connect');
    im.w = new Wire(conn);
    const greet = await withTimeout(im.w.line(), 15000, 'IMAP greeting');
    if (!/^\* (OK|PREAUTH)/i.test(greet)) throw new Error(`IMAP greeting failed: ${greet}`);
    return im;
  }
  async cmd(c: string): Promise<ImapItem[]> {
    const tag = `A${++this.n}`;
    await this.w.write(`${tag} ${c}\r\n`);
    const items: ImapItem[] = [];
    let cur: ImapItem | null = null;
    for (;;) {
      const l = await withTimeout(this.w.line(), 60000, 'IMAP response');
      if (l.startsWith(tag + ' ')) {
        if (!/^\S+ OK/i.test(l)) throw new Error(l.slice(tag.length + 1));
        return items;
      }
      if (l.startsWith('* ')) { cur = { text: l, literals: [] }; items.push(cur); }
      else if (cur) cur.text += l;
      const m = l.match(/\{(\d+)\}$/);
      if (m) {
        const lit = await this.w.bytes(Number(m[1]));
        (cur ?? (cur = { text: '', literals: [] })).literals.push(lit);
      }
    }
  }
  login(user: string, pass: string) { return this.cmd(`LOGIN ${q(user)} ${q(pass)}`); }
  async select(box = 'INBOX'): Promise<number | null> {
    const r = await this.cmd(`SELECT ${q(box)}`);
    for (const it of r) { const m = it.text.match(/UIDVALIDITY (\d+)/i); if (m) return Number(m[1]); }
    return null;
  }
  async search(criteria: string): Promise<number[]> {
    const r = await this.cmd(`UID SEARCH ${criteria}`);
    const out: number[] = [];
    for (const it of r) if (/^\* SEARCH/i.test(it.text)) out.push(...it.text.slice(9).trim().split(/\s+/).filter(Boolean).map(Number));
    return out;
  }
  async fetchRaw(uids: number[]): Promise<{ uid: number; raw: Uint8Array }[]> {
    if (!uids.length) return [];
    const r = await this.cmd(`UID FETCH ${uids.join(',')} (UID BODY.PEEK[])`);
    const out: { uid: number; raw: Uint8Array }[] = [];
    for (const it of r) {
      const m = it.text.match(/UID (\d+)/i);
      if (m && it.literals[0]) out.push({ uid: Number(m[1]), raw: it.literals[0] });
    }
    return out;
  }
  async logout() { try { await this.cmd('LOGOUT'); } catch { /* ignore */ } this.w.close(); }
}

// ---------- SMTP ----------
export interface OutAttachment { name: string; type: string; base64: string }
export interface OutMail {
  fromEmail: string; fromName?: string | null; to: string[]; cc?: string[];
  subject: string; text: string; messageId: string; inReplyTo?: string | null; references?: string | null;
  attachments?: OutAttachment[];
}
const hdr = (v: string) => (/^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${b64(enc.encode(v))}?=`);
const wrap = (s: string) => s.replace(/(.{76})/g, '$1\r\n');

export function buildMime(m: OutMail): string {
  const boundary = `vg_${crypto.randomUUID()}`;
  const from = m.fromName ? `${hdr(m.fromName)} <${m.fromEmail}>` : m.fromEmail;
  const head = [
    `From: ${from}`, `To: ${m.to.join(', ')}`,
    ...(m.cc?.length ? [`Cc: ${m.cc.join(', ')}`] : []),
    `Subject: ${hdr(m.subject)}`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${m.messageId}`,
    ...(m.inReplyTo ? [`In-Reply-To: ${m.inReplyTo}`] : []),
    ...(m.references ? [`References: ${m.references}`] : []),
    'MIME-Version: 1.0',
  ];
  const textPart = ['Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap(b64(enc.encode(m.text)))].join('\r\n');
  if (!m.attachments?.length) return [...head, textPart].join('\r\n');
  const parts = [`--${boundary}\r\n${textPart}`];
  for (const a of m.attachments) {
    parts.push(`--${boundary}\r\nContent-Type: ${a.type || 'application/octet-stream'}; name="${hdr(a.name)}"\r\nContent-Disposition: attachment; filename="${hdr(a.name)}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(a.base64.replace(/\s/g, ''))}`);
  }
  return [...head, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', ...parts, `--${boundary}--`, ''].join('\r\n');
}

async function smtpRead(w: Wire): Promise<{ code: number; text: string }> {
  let text = '';
  for (;;) {
    const l = await withTimeout(w.line(), 30000, 'SMTP response');
    text += l + '\n';
    if (/^\d{3} /.test(l) || /^\d{3}$/.test(l)) return { code: Number(l.slice(0, 3)), text };
  }
}
async function expect(w: Wire, ok: number[], cmd?: string) {
  if (cmd !== undefined) await w.write(cmd + '\r\n');
  const r = await smtpRead(w);
  if (!ok.includes(r.code)) throw new Error(`SMTP ${r.code}: ${r.text.trim().slice(0, 300)}`);
  return r;
}

export async function smtpSession(host: string, port: number, user: string, pass: string, mail?: OutMail) {
  if (port !== 465) throw new Error('SMTP_PORT_UNSUPPORTED');
  const conn = await withTimeout(Deno.connectTls({ hostname: host, port }), 15000, 'SMTP connect');
  const w = new Wire(conn);
  try {
    await expect(w, [220]);
    await expect(w, [250], 'EHLO vogatchi.app');
    await expect(w, [334], 'AUTH LOGIN');
    await expect(w, [334], b64(enc.encode(user)));
    await expect(w, [235], b64(enc.encode(pass)));
    if (mail) {
      await expect(w, [250], `MAIL FROM:<${mail.fromEmail}>`);
      for (const r of [...mail.to, ...(mail.cc ?? [])]) await expect(w, [250, 251], `RCPT TO:<${r}>`);
      await expect(w, [354], 'DATA');
      const body = buildMime(mail).replace(/\r\n\./g, '\r\n..');
      await w.write(body + '\r\n.\r\n');
      await expect(w, [250]);
    }
    await w.write('QUIT\r\n');
  } finally { w.close(); }
}

export function friendlyMailError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m === 'SMTP_PORT_UNSUPPORTED') return 'منفذ الإرسال لازم يكون 465 (SSL). المنفذ 587 غير مدعوم.';
  if (/AUTHENTICATIONFAILED|Invalid credentials|535|LOGIN failed|authentication failed/i.test(m)) return 'اسم المستخدم أو كلمة المرور غير صحيحة. لـ Gmail استخدم «كلمة مرور التطبيقات».';
  if (/BasicAuthBlocked|basic auth/i.test(m)) return 'Microsoft قافلة الدخول بكلمة المرور على هذا الحساب.';
  if (/timed out|connect|dns|resolve/i.test(m)) return 'تعذر الوصول لخادم البريد. راجع اسم الخادم والمنفذ.';
  return m.slice(0, 300);
}

export const normalizeSubject = (s: string | null | undefined) =>
  (s ?? '').replace(/^\s*((re|fw|fwd|رد|إعادة توجيه)\s*:\s*)+/i, '').trim().toLowerCase();
