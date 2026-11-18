export function getInvitationEmailWarning(data: unknown, error: unknown): string | null {
  if (!error && typeof data === 'object' && data !== null) {
    const result = data as { success?: unknown; reason?: unknown };
    if (result.success === true) return null;
    if (result.reason === 'recipient_suppressed') {
      return 'الدعوة محفوظة، لكن مزوّد البريد أوقف الإرسال لهذا العنوان. انسخ رابط الدعوة لمشاركته.';
    }
  }
  return 'الدعوة محفوظة، لكن تعذّر تأكيد إرسال البريد. انسخ رابط الدعوة أو أعد المحاولة.';
}
