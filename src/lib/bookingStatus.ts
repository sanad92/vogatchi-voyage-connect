const labels: Record<string, string> = {
  pending: 'معلق',
  processing: 'قيد المعالجة',
  confirmed: 'مؤكد',
  cancelled: 'ملغي',
  canceled: 'ملغي',
  completed: 'مكتمل',
  paid: 'مدفوع',
  draft: 'مسودة',
};

export const bookingStatusLabel = (status?: string | null) =>
  (status && Object.prototype.hasOwnProperty.call(labels, status) ? labels[status] : 'غير محدد');
