import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { labelMissing, labelViolation, VIOLATION_GUIDANCE, type GateResult } from '@/lib/sop';

interface Props {
  gate?: GateResult | null;
  okLabel?: string;
  compact?: boolean;
  /** Optional one-click shortcut to resolve the block (e.g. open handover). */
  action?: { label: string; onClick: () => void } | null;
}

/**
 * Renders the blocking reason as a plain-language next step, with the exact
 * missing fields underneath so nothing is hidden.
 */
export const SopGateAlert = ({ gate, okLabel = 'كل الشروط مستوفاة', compact, action }: Props) => {
  if (!gate) return null;

  if (gate.allowed) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800 dark:text-emerald-300">{okLabel}</AlertDescription>
      </Alert>
    );
  }

  const missing = gate.missing_fields || [];
  const violations = gate.violations || [];
  const guidance = violations.map((v) => VIOLATION_GUIDANCE[v]).filter(Boolean)[0]
    || (missing.length ? `أكمل البيانات الناقصة: ${missing.map(labelMissing).join('، ')}` : '');

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      {!compact && <AlertTitle>الخطوة اللي لازم تتعمل الأول</AlertTitle>}
      <AlertDescription>
        {guidance && <p className="text-sm font-medium">{guidance}</p>}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {violations.map((v) => (
            <Badge key={v} variant="destructive" className="font-normal">{labelViolation(v)}</Badge>
          ))}
          {missing.map((m) => (
            <Badge key={m} variant="outline" className="font-normal">ناقص: {labelMissing(m)}</Badge>
          ))}
        </div>
        {gate.collection && (
          <div className="mt-2 text-xs">
            سياسة الدفع: {gate.collection.policy} — المطلوب {Number(gate.collection.required).toLocaleString()} /
            المحصّل {Number(gate.collection.paid).toLocaleString()}
          </div>
        )}
        {action && (
          <Button size="sm" variant="outline" className="mt-2" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default SopGateAlert;
