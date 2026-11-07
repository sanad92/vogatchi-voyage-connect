/**
 * Safar Flow - pure, side-effect-free workflow planning core (V0).
 *
 * This module NEVER sends messages, changes reservations, calls APIs, or
 * creates financial transactions. It is also safe to run against sample
 * events before the eventual server-side, tenant-scoped execution engine.
 */
export type FlowEventType =
  | 'quote.sent'
  | 'booking.created'
  | 'supplier.payment_due'
  | 'whatsapp.inbound'
  | 'booking.pre_travel';

export type FlowActionType =
  | 'create_task'
  | 'notify_staff'
  | 'draft_request'
  | 'prepare_checklist'
  | 'request_review';

export type ConditionOperator = 'eq' | 'neq' | 'gte' | 'lte' | 'exists';

export interface FlowCondition {
  path: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface FlowAction {
  id: string;
  type: FlowActionType;
  label: string;
  reviewRequired?: boolean;
}

export interface FlowTemplate {
  id: string;
  title: string;
  description: string;
  category: 'sales' | 'operations' | 'finance' | 'ai';
  trigger: FlowEventType;
  delayMinutes: number;
  recheckAfterDelay: boolean;
  conditions: FlowCondition[];
  actions: FlowAction[];
}

export interface FlowSampleEvent {
  id: string;
  label: string;
  type: FlowEventType;
  payload: Record<string, unknown>;
}

export interface FlowPreview {
  templateId: string;
  matched: boolean;
  issues: string[];
  delayMinutes: number;
  recheckAfterDelay: boolean;
  actions: Array<{ id: string; label: string; type: FlowActionType; reviewRequired: boolean }>;
  mode: 'preview_only';
}

const EVENT_TYPES: FlowEventType[] = [
  'quote.sent', 'booking.created', 'supplier.payment_due',
  'whatsapp.inbound', 'booking.pre_travel',
];
const ACTION_TYPES: FlowActionType[] = [
  'create_task', 'notify_staff', 'draft_request', 'prepare_checklist', 'request_review',
];
const OPERATORS: ConditionOperator[] = ['eq', 'neq', 'gte', 'lte', 'exists'];

function safePath(source: Record<string, unknown>, path: string): unknown {
  if (!/^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)*$/.test(path)) return undefined;
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (['__proto__', 'prototype', 'constructor'].includes(part)) return undefined;
    if (!current || typeof current !== 'object' || Array.isArray(current)
        || !Object.prototype.hasOwnProperty.call(current, part)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function matchesCondition(condition: FlowCondition, payload: Record<string, unknown>): boolean {
  const actual = safePath(payload, condition.path);
  if (condition.operator === 'exists') return actual !== undefined && actual !== null;
  if (actual === undefined || actual === null || condition.value === undefined) return false;
  if (condition.operator === 'eq') return actual === condition.value;
  if (condition.operator === 'neq') return actual !== condition.value;
  // Ordered comparisons must use finite numbers. No implicit string coercion.
  if (typeof actual !== 'number' || typeof condition.value !== 'number'
      || !Number.isFinite(actual) || !Number.isFinite(condition.value)) return false;
  return condition.operator === 'gte'
    ? actual >= condition.value
    : condition.operator === 'lte'
      ? actual <= condition.value
      : false;
}

export function validateFlowTemplate(flow: FlowTemplate): string[] {
  const issues: string[] = [];
  if (!flow.id || !flow.title.trim()) issues.push('اسم القالب أو معرفه غير مكتمل');
  if (!EVENT_TYPES.includes(flow.trigger)) issues.push('نوع الحدث غير مدعوم');
  if (!Number.isSafeInteger(flow.delayMinutes) || flow.delayMinutes < 0
      || flow.delayMinutes > 60 * 24 * 30) issues.push('الانتظار خارج المدى المسموح');
  if (flow.actions.length === 0 || flow.actions.length > 12) issues.push('عدد الإجراءات غير مناسب');
  if (flow.conditions.length > 20) issues.push('عدد الشروط يتجاوز الحد');
  const ids = new Set<string>();
  for (const action of flow.actions) {
    if (!action.id || ids.has(action.id)) issues.push('معرف إجراء مكرر أو فارغ');
    ids.add(action.id);
    if (!ACTION_TYPES.includes(action.type)) issues.push('نوع إجراء غير مسموح');
    if (!action.label.trim()) issues.push('وصف إجراء مفقود');
  }
  for (const condition of flow.conditions) {
    if (!OPERATORS.includes(condition.operator)) issues.push('عملية مقارنة غير مدعومة');
    if (safePath({ customer: { replied: true } }, condition.path) === undefined
        && !/^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)*$/.test(condition.path)) {
      issues.push('مسار بيانات غير صالح');
    }
    if (condition.operator !== 'exists' && condition.value === undefined) issues.push('شرط بلا قيمة');
  }
  return issues;
}

export function simulateFlow(flow: FlowTemplate, event: FlowSampleEvent): FlowPreview {
  const issues = validateFlowTemplate(flow);
  const matched = issues.length === 0 && event.type === flow.trigger
    && flow.conditions.every(condition => matchesCondition(condition, event.payload));
  return {
    templateId: flow.id,
    matched,
    issues,
    delayMinutes: flow.delayMinutes,
    recheckAfterDelay: flow.recheckAfterDelay,
    actions: matched ? flow.actions.map(a => ({
      id: a.id, type: a.type, label: a.label, reviewRequired: !!a.reviewRequired,
    })) : [],
    mode: 'preview_only',
  };
}
