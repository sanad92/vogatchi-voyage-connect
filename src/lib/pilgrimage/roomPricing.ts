export type PrivateRule =
  | { method: 'fixed'; per_person: Record<string, number> }
  | { method: 'supplement'; per_empty_bed: number };

export function privateRoomTotal(rule: PrivateRule | undefined, sharedPrice: number, occupied: number, roomSize: number) {
  if (!Number.isFinite(sharedPrice) || sharedPrice <= 0 || occupied < 1 || occupied > roomSize) return 0;
  const total = rule?.method === 'fixed' ? Number(rule.per_person[occupied] ?? 0) * occupied
    : rule?.method === 'supplement' ? sharedPrice * occupied + Number(rule.per_empty_bed) * (roomSize - occupied)
      : 0;
  return Number.isFinite(total) && total > 0 ? Math.round(total * 100) / 100 : 0;
}
