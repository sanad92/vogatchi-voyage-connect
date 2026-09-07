// Plain numbers (including negatives like -1500.00) must stay numeric in Excel.
const isNumericValue = (value: string) => /^-?\d+(\.\d+)?$/.test(value.trim());

const protectSpreadsheetCell = (value: string) =>
  !isNumericValue(value) && /^[=+\-@]/.test(value) ? `'${value}` : value;

const csvCell = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const raw = protectSpreadsheetCell(String(value ?? ''));
  return `"${raw.replace(/"/g, '""')}"`;
};

export const downloadCsv = (filename: string, headers: string[], rows: unknown[][]) => {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
