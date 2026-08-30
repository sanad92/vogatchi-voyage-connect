export const PLAN_FEATURES = {
  FINANCE: 'finance',
  ADVANCED_REPORTS: 'advanced_reports',
  WHATSAPP: 'whatsapp',
  AUTOMATION: 'automation',
  MARKETING: 'marketing',
  AI_ASSISTANT: 'ai_assistant',
  AUDIT_LOG: 'audit_log',
  MULTI_BRANCH: 'multi_branch',
  WHITE_LABEL: 'white_label',
  ENTERPRISE_CONTROLS: 'enterprise_controls',
} as const;

export type PlanFeature = (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES];

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  [PLAN_FEATURES.FINANCE]: 'الإدارة المالية والمحاسبة',
  [PLAN_FEATURES.ADVANCED_REPORTS]: 'التقارير والتحليلات المتقدمة',
  [PLAN_FEATURES.WHATSAPP]: 'واتساب وإدارة المحادثات',
  [PLAN_FEATURES.AUTOMATION]: 'الأتمتة وقواعد التشغيل',
  [PLAN_FEATURES.MARKETING]: 'رحلات التسويق',
  [PLAN_FEATURES.AI_ASSISTANT]: 'المساعد الذكي',
  [PLAN_FEATURES.AUDIT_LOG]: 'سجل المراجعة',
  [PLAN_FEATURES.MULTI_BRANCH]: 'الفروع والأقسام',
  [PLAN_FEATURES.WHITE_LABEL]: 'الهوية المخصصة',
  [PLAN_FEATURES.ENTERPRISE_CONTROLS]: 'ضوابط المؤسسات المتقدمة',
};

interface PlanFeatureRouteRule {
  feature: PlanFeature;
  minimumPlan: 'النمو' | 'الأعمال';
  paths: string[];
}

const ROUTE_RULES: PlanFeatureRouteRule[] = [
  {
    feature: PLAN_FEATURES.WHITE_LABEL,
    minimumPlan: 'الأعمال',
    paths: ['/organization/white-label', '/site-customization', '/landing-admin', '/admin/cms'],
  },
  {
    feature: PLAN_FEATURES.ENTERPRISE_CONTROLS,
    minimumPlan: 'الأعمال',
    paths: ['/organization/feature-flags', '/organization/security', '/monitoring'],
  },
  {
    feature: PLAN_FEATURES.MULTI_BRANCH,
    minimumPlan: 'النمو',
    // '/organization/departments' and '/organization/sop-team' stay ungated:
    // owners must always be able to assign departments to restore agent access.
    paths: ['/organization/branches'],
  },

  {
    feature: PLAN_FEATURES.WHATSAPP,
    minimumPlan: 'النمو',
    paths: ['/whatsapp'],
  },
  {
    feature: PLAN_FEATURES.AUTOMATION,
    minimumPlan: 'النمو',
    paths: ['/automation'],
  },
  {
    feature: PLAN_FEATURES.MARKETING,
    minimumPlan: 'النمو',
    paths: ['/marketing'],
  },
  {
    feature: PLAN_FEATURES.AUDIT_LOG,
    minimumPlan: 'النمو',
    paths: ['/audit-log'],
  },
  {
    feature: PLAN_FEATURES.AI_ASSISTANT,
    minimumPlan: 'النمو',
    paths: ['/ai-assistant'],
  },
  {
    feature: PLAN_FEATURES.ADVANCED_REPORTS,
    minimumPlan: 'النمو',
    paths: [
      '/reports/business-health',
      '/reports/lead-cycle-time',
      '/sop/compliance',
      '/profit-analytics',
      '/export-center',
    ],
  },
  {
    feature: PLAN_FEATURES.FINANCE,
    minimumPlan: 'النمو',
    paths: [
      '/bank-accounts',
      '/expense-management',
      '/chart-of-accounts',
      '/journal-entries',
      '/accounting-reports',
      '/cfo-dashboard',
      '/customer-ledger',
      '/supplier-ledger',
      '/executive-finance',
      '/treasury',
      '/cash-flow',
      '/finance-approvals',
      '/trial-balance',
      '/income-statement',
      '/balance-sheet',
      '/finance/historical-recovery',
      '/financial-validation',
      '/cost-centers',
      '/accounting-periods',
      '/general-ledger',
      '/bank-reconciliation',
      '/travel-kpis',
    ],
  },
];

const routeMatches = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`) || (route === '/whatsapp' && pathname.startsWith('/whatsapp-'));

export const getRequiredPlanFeature = (pathname: string): PlanFeatureRouteRule | null =>
  ROUTE_RULES.find((rule) => rule.paths.some((route) => routeMatches(pathname, route))) ?? null;

