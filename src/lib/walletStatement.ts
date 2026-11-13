import type { PartyWalletMovement } from './partyWalletMovements';

const cairoDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Cairo' });

export function walletStatementDay(value: string | Date | null): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : cairoDay.format(date);
}

export interface WalletStatementTotals {
  currency: string;
  opening: number;
  added: number;
  applied: number;
  closing: number;
}

export function buildWalletStatement(movements: PartyWalletMovement[], from: string, through: string) {
  const totals = new Map<string, WalletStatementTotals>();
  const rows: Array<PartyWalletMovement & { day: string }> = [];
  let undatedCount = 0;
  for (const movement of movements) {
    const day = walletStatementDay(movement.date);
    if (!day) {
      undatedCount += 1;
      continue;
    }
    if (day > through) continue;
    const delta = Math.round(movement.balanceDelta * 100);
    const isInPeriod = day >= from;
    if (isInPeriod) rows.push({ ...movement, day });
    if (!isInPeriod && delta === 0) continue;

    const balance = totals.get(movement.currency) ?? {
      currency: movement.currency, opening: 0, added: 0, applied: 0, closing: 0,
    };
    if (!isInPeriod) balance.opening += delta;
    else if (delta > 0) balance.added += delta;
    else balance.applied -= delta;
    balance.closing = balance.opening + balance.added - balance.applied;
    totals.set(movement.currency, balance);
  }
  rows.sort((a, b) => a.day.localeCompare(b.day)
    || Date.parse(a.date!) - Date.parse(b.date!) || a.id.localeCompare(b.id));
  return {
    rows,
    totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    undatedCount,
  };
}
