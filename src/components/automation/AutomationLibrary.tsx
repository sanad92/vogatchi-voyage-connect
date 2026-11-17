import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, CircleDollarSign, ClipboardList, FileText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AUTOMATION_CATEGORIES, AUTOMATION_LIBRARY, QUOTE_FOLLOWUP, type AutomationCategory, type LibraryRuleKey } from '@/lib/automationLibrary';

const categoryIcons = {
  bookings: ClipboardList,
  collections: CircleDollarSign,
  suppliers: BriefcaseBusiness,
  travel: CalendarDays,
  sales: FileText,
};

type Props = {
  enabled: ReadonlySet<string>;
  canEdit: boolean;
  canAccessQuotes: boolean;
  busy: boolean;
  onToggle: (key: LibraryRuleKey, enabled: boolean) => void;
};

function searchText(value: string) {
  return value.normalize('NFKD').replace(/\p{M}|ـ/gu, '').trim().toLowerCase();
}

export function AutomationLibrary({ enabled, canEdit, canAccessQuotes, busy, onToggle }: Props) {
  const [category, setCategory] = useState<AutomationCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const term = searchText(query);
  const sections = AUTOMATION_CATEGORIES
    .filter(item => category === 'all' || item.key === category)
    .map(item => ({
      ...item,
      rules: AUTOMATION_LIBRARY.filter(rule =>
        rule.category === item.key && searchText(`${item.label} ${rule.name} ${rule.description}`).includes(term)),
      showQuote: item.key === 'sales' && canAccessQuotes
        && searchText(`${item.label} ${QUOTE_FOLLOWUP.name} ${QUOTE_FOLLOWUP.description}`).includes(term),
    }))
    .filter(item => item.rules.length > 0 || item.showQuote);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search aria-hidden className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" type="search" aria-label="ابحث في مكتبة القواعد" placeholder="ابحث عن قاعدة" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={category === 'all' ? 'secondary' : 'ghost'} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>كل الأقسام</Button>
          {AUTOMATION_CATEGORIES.filter(item => item.key !== 'sales' || canAccessQuotes).map(item => (
            <Button key={item.key} size="sm" variant={category === item.key ? 'secondary' : 'ghost'} aria-pressed={category === item.key} onClick={() => setCategory(item.key)}>
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {sections.length === 0 ? (
        <p role="status" className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد قواعد مطابقة للبحث.</p>
      ) : sections.map(section => {
        const Icon = categoryIcons[section.key];
        return (
          <section key={section.key} className="space-y-3" aria-labelledby={`automation-category-${section.key}`}>
            <h2 id={`automation-category-${section.key}`} className="flex items-center gap-2 font-semibold">
              <Icon aria-hidden className="h-4 w-4 text-primary" />{section.label}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {section.rules.map(rule => (
                <LibraryRuleCard key={rule.key} rule={rule} enabled={enabled.has(rule.key)} canEdit={canEdit} busy={busy} onToggle={onToggle} />
              ))}
              {section.showQuote && (
                <Card>
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1 basis-48">
                      <h3 className="text-sm font-semibold">{QUOTE_FOLLOWUP.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{QUOTE_FOLLOWUP.description}</p>
                    </div>
                    <Button asChild variant="outline" size="sm"><Link to="/quotes">إعدادات عروض الأسعار</Link></Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function LibraryRuleCard({ rule, enabled, canEdit, busy, onToggle }: {
  rule: typeof AUTOMATION_LIBRARY[number];
  enabled: boolean;
} & Pick<Props, 'canEdit' | 'busy' | 'onToggle'>) {
  return (
    <Card>
      <CardContent className="flex h-full items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{rule.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          {canEdit && (
            <Switch dir="ltr" aria-label={rule.name} checked={enabled} disabled={busy} onCheckedChange={checked => onToggle(rule.key, checked)} />
          )}
          <Badge variant={enabled ? 'secondary' : 'outline'}>{enabled ? 'نشط' : 'متاح'}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
