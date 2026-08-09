import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { labelMissing, labelViolation, type GateResult } from '@/lib/sop';

interface Props {
  gate?: GateResult | null;
  okLabel?: string;
  compact?: boolean;
}

/**
 * Renders the exact missing fields and rule violations returned by the
 * database gate, so blocked transitions always say why.
 */
export const SopGateAlert = ({ gate, okLabel = 'كل الشروط مستوفاة', compact }: Props) => {
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

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      {!compact && <AlertTitle>لا يمكن المتابعة</AlertTitle>}
      <AlertDescription>
        <div className="flex flex-wrap gap-1.5 mt-1">
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
      </AlertDescription>
    </Alert>
  );
};

export default SopGateAlert;
