# خطة إصلاح ESLint Errors (735 → 0)

## Status: 0/735 fixed

## Phase 1: Auto-fix + Config (Target: 500 errors)
- [ ] `npm run lint -- --fix`
- [ ] Edit eslint.config.js: relax 'no-case-declarations', unused-vars to 'warn'

## Phase 2: Priority Files (TODO original + Open tabs)
1. [ ] src/components/admin/BackupManagementTab.tsx (switch cases)
2. [ ] src/components/crm/followups/CustomerFollowUps.tsx (switch cases)
3. [ ] src/hooks/useEnhancedFormValidation.tsx (8 errors, duplicate logic)
4. [ ] src/hooks/useProfitLossCalculations.tsx (rules-of-hooks, nested useQuery)
5. [ ] src/components/admin/EnhancedReportExporter.tsx (async issues)

## Phase 3: Global search & fix
- [ ] Remove unused imports across src/**
- [ ] Add React.FC types
- [ ] Run `npm run lint` after each batch

## Commands to run:
```
npm run lint -- --fix
npm run lint
npm run dev
```

**Next step: Fix BackupManagementTab.tsx → check `npm run lint src/components/admin/BackupManagementTab.tsx`**

