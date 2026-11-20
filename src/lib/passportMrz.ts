export interface PassportFields {
  full_name: string;
  passport_number: string;
  nationality: string;
  birth_date: string;
  expiry_date: string;
}

function checkDigit(value: string, expected: string) {
  if (!/^\d$/.test(expected)) return false;
  const weights = [7, 3, 1];
  const sum = Array.from(value).reduce((total, char, index) => {
    const numeric = char === '<' ? 0 : /^[0-9]$/.test(char) ? Number(char) : char.charCodeAt(0) - 55;
    return total + numeric * weights[index % 3];
  }, 0);
  return sum % 10 === Number(expected);
}

function parseDate(value: string, year: number) {
  if (!/^\d{6}$/.test(value)) return '';
  const iso = `${year}-${value.slice(2, 4)}-${value.slice(4, 6)}`;
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : '';
}

function verifiedLowerLine(raw: string) {
  const candidates = raw.length === 45
    ? Array.from({ length: 15 }, (_, index) => raw.slice(0, 28 + index) + raw.slice(29 + index))
    : [raw];
  return candidates.find(line => line.length === 44
    && checkDigit(line.slice(0, 9), line[9])
    && checkDigit(line.slice(13, 19), line[19])
    && checkDigit(line.slice(21, 27), line[27])
    && (line[42] === '<' || checkDigit(line.slice(28, 42), line[42]))
    && checkDigit(line.slice(0, 10) + line.slice(13, 20) + line.slice(21, 43), line[43]));
}

export function readPassportMrz(text: string, now = new Date()): PassportFields | null {
  const lines = text.toUpperCase().split(/\r?\n/)
    .map(line => line.replace(/[^A-Z0-9<]/g, '')).filter(Boolean);
  const year = now.getUTCFullYear();
  const century = Math.floor(year / 100) * 100;

  for (let index = 0; index + 1 < lines.length; index++) {
    const upper = lines[index].slice(0, 44);
    if (!/^P[A-Z<][A-Z<]{3}[A-Z<]{10,39}$/.test(upper)) continue;
    const lower = verifiedLowerLine(lines[index + 1]);
    if (!lower) continue;
    const number = lower.slice(0, 9);
    const birth = lower.slice(13, 19);
    const expiry = lower.slice(21, 27);
    const identifiers = upper.slice(5).split('<<<')[0].split('<<');
    const fullName = [identifiers[1], identifiers[0]].filter(Boolean).join(' ').replace(/<+/g, ' ').trim();
    const passportNumber = number.replace(/<+$/, '');
    const nationality = lower.slice(10, 13).replace(/0/g, 'O').replace(/1/g, 'I');
    if (fullName.length < 2 || !/^[A-Z0-9]{3,9}$/.test(passportNumber) || !/^[A-Z]{3}$/.test(nationality)) continue;

    let birthYear = century + Number(birth.slice(0, 2));
    if (parseDate(birth, birthYear) > now.toISOString().slice(0, 10)) birthYear -= 100;
    let expiryYear = century + Number(expiry.slice(0, 2));
    if (expiryYear < year - 50) expiryYear += 100;
    if (expiryYear > year + 50) expiryYear -= 100;
    const birthDate = parseDate(birth, birthYear);
    const expiryDate = parseDate(expiry, expiryYear);
    if (!birthDate || !expiryDate || birthDate >= expiryDate) continue;
    return { full_name: fullName, passport_number: passportNumber, nationality, birth_date: birthDate, expiry_date: expiryDate };
  }
  return null;
}
