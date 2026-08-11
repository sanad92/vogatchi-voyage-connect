import type { DocBrand, DocFact, DocSection } from '@/lib/travelDocuments';

export const DocHeader = ({
  brand,
  titleAr,
  titleEn,
  meta,
  badge,
}: {
  brand: DocBrand;
  titleAr: string;
  titleEn: string;
  meta: DocFact[];
  badge?: { label: string; tone: 'ok' | 'warn' | 'muted' };
}) => (
  <header className="doc-block">
    <div className="doc-band px-10 py-7 flex items-start justify-between gap-6">
      <div className="min-w-0">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.name}
            crossOrigin="anonymous"
            className="h-12 mb-3 object-contain"
          />
        ) : null}
        <p className="text-xl font-semibold tracking-tight">{brand.name}</p>
        <p className="text-[11px] opacity-85 mt-1 leading-5">
          {[brand.address, brand.phone, brand.email, brand.website].filter(Boolean).join('  ·  ')}
        </p>
        {(brand.taxNumber || brand.commercialRegistration) && (
          <p className="text-[10px] opacity-75 mt-0.5">
            {[
              brand.taxNumber ? `الرقم الضريبي: ${brand.taxNumber}` : null,
              brand.commercialRegistration ? `س.ت: ${brand.commercialRegistration}` : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        )}
      </div>
      <div className="text-left shrink-0" dir="ltr">
        <p className="text-2xl font-bold tracking-[0.14em] uppercase">{titleEn}</p>
        <p className="text-sm opacity-90 mt-0.5" dir="rtl">
          {titleAr}
        </p>
        {badge && (
          <span
            className="inline-block mt-3 rounded-full px-3 py-1 text-[11px] font-semibold bg-white/15 border border-white/30"
            dir="rtl"
          >
            {badge.label}
          </span>
        )}
      </div>
    </div>
    <div className="doc-goldline h-[3px] w-full" />
    <div className="doc-soft px-10 py-3 grid grid-cols-4 gap-4 border-b doc-rule">
      {meta.map((m) => (
        <div key={m.label}>
          <p className="doc-muted text-[10px] uppercase tracking-wide">{m.label}</p>
          <p className="text-[12px] font-semibold mt-0.5 break-words">{m.value}</p>
        </div>
      ))}
    </div>
  </header>
);

export const DocSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-3">
    <span className="doc-goldline h-[2px] w-6 rounded-full" />
    <h2 className="doc-section-title text-[13px] font-bold uppercase">{children}</h2>
    <span className="flex-1 border-b doc-rule" />
  </div>
);

export const FactGrid = ({ facts, columns = 3 }: { facts: DocFact[]; columns?: number }) => {
  if (!facts.length) return null;
  return (
    <div
      className="grid gap-x-6 gap-y-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {facts.map((f) => (
        <div key={`${f.label}-${f.value}`} className="min-w-0">
          <p className="doc-muted text-[10px] uppercase tracking-wide">{f.label}</p>
          <p className="text-[12.5px] font-medium mt-0.5 break-words leading-5">{f.value}</p>
        </div>
      ))}
    </div>
  );
};

export const ServiceSectionCard = ({ section }: { section: DocSection }) => (
  <div className="doc-block rounded-xl border doc-rule overflow-hidden mb-4">
    <div className="doc-soft px-5 py-3 flex items-baseline justify-between gap-4 border-b doc-rule">
      <p className="text-[13px] font-bold doc-brandtext">{section.title}</p>
      {section.subtitle && <p className="doc-muted text-[11px]">{section.subtitle}</p>}
    </div>
    <div className="px-5 py-4">
      <FactGrid facts={section.facts} />
      {section.notes?.length ? (
        <div className="mt-4 pt-3 border-t doc-rule space-y-1">
          {section.notes.map((n, i) => (
            <p key={i} className="doc-muted text-[11px] leading-5">
              {n}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  </div>
);

export const DocFooter = ({ brand }: { brand: DocBrand }) => (
  <footer className="doc-block mt-auto px-10 pt-4 pb-8 border-t doc-rule">
    <p className="text-center text-[11px] font-medium doc-brandtext">
      {brand.footerText || `${brand.name} — رحلات مصممة بعناية`}
    </p>
    <p className="doc-muted text-center text-[10px] mt-1" dir="ltr">
      {[brand.phone, brand.email, brand.website].filter(Boolean).join('  ·  ')}
    </p>
  </footer>
);
