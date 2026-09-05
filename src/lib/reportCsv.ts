const protectSpreadsheetCell = (value: string) =>
  /^[=+\-@]/.test(value) ? `'${value}` : value;

const csvCell = (value: unknown) => {
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
