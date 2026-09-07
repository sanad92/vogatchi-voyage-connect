export interface HierarchyAccount {
  id: string;
  organization_id: string;
  parent_id: string | null;
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  account_type: string;
}

/** Display every account once, including malformed/orphaned legacy records. */
export function accountHierarchy<T extends HierarchyAccount>(accounts: T[], search = '', type = 'all') {
  const byId = new Map(accounts.map(account => [account.id, account]));
  const children = new Map<string, T[]>();
  const roots: T[] = [];
  const invalid = new Set<string>();
  for (const account of accounts) {
    const parent = account.parent_id ? byId.get(account.parent_id) : undefined;
    if (parent && parent.id !== account.id && parent.organization_id === account.organization_id && parent.account_type === account.account_type) {
      children.set(parent.id, [...(children.get(parent.id) ?? []), account]);
    } else {
      roots.push(account);
      if (account.parent_id) invalid.add(account.id);
    }
  }
  const term = search.trim().toLocaleLowerCase();
  const visible = new Set<string>();
  for (const account of accounts) {
    if (type !== 'all' && account.account_type !== type) continue;
    if (term && ![account.account_code, account.account_name, account.account_name_ar ?? ''].some(value => value.toLocaleLowerCase().includes(term))) continue;
    let current: T | undefined = account;
    const chain = new Set<string>();
    while (current && !chain.has(current.id)) {
      visible.add(current.id);
      chain.add(current.id);
      const parent: T | undefined = current.parent_id ? byId.get(current.parent_id) : undefined;
      current = parent && parent.organization_id === current.organization_id && parent.account_type === current.account_type ? parent : undefined;
    }
  }
  const result: { account: T; depth: number; invalidParent: boolean }[] = [];
  const visited = new Set<string>();
  const sort = (values: T[]) => [...values].sort((a, b) => a.account_code.localeCompare(b.account_code, undefined, { numeric: true }));
  const visit = (account: T, depth: number, broken = false) => {
    if (visited.has(account.id)) return;
    visited.add(account.id);
    if (visible.has(account.id)) result.push({ account, depth, invalidParent: broken || invalid.has(account.id) });
    for (const child of sort(children.get(account.id) ?? [])) visit(child, depth + 1, broken);
  };
  for (const root of sort(roots)) visit(root, 0);
  // Cycles have no root; surface them for correction rather than hiding them.
  for (const account of sort(accounts)) if (!visited.has(account.id)) visit(account, 0, true);
  return result;
}
