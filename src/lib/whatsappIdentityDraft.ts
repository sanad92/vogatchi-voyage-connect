export type IdentityReviewFields = { name: string; nationality: string };
export const IDENTITY_OCR_MODEL_PATH = 'assets/identity-ocr-v1';

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const isIdentityImage = (mime: string) => imageMimeTypes.has(mime);
export const isIdentityAttachment = (mime: string) => isIdentityImage(mime) || mime === 'application/pdf';

const languageField = /^[\p{L}][\p{L} .'’-]*$/u;

export function normalizeIdentityField(raw: string, maxLength: number): string | null {
  const value = raw.normalize('NFC').replace(/\s+/gu, ' ').trim();
  return value.length >= 2 && value.length <= maxLength && languageField.test(value) ? value : null;
}

function checkMrzDigit(value: string, expected: string) {
  if (!/^\d$/.test(expected)) return false;
  const weights = [7, 3, 1];
  const total = [...value].reduce((sum, character, index) => {
    const code = character === '<' ? 0 : /\d/.test(character) ? Number(character) : character.charCodeAt(0) - 55;
    return sum + code * weights[index % weights.length];
  }, 0);
  return total % 10 === Number(expected);
}

function passportFields(lines: string[]): IdentityReviewFields | null {
  for (let index = 0; index < lines.length - 1; index++) {
    const [first, second] = lines.slice(index, index + 2).map(line =>
      line.toUpperCase().replace(/[ «‹]/g, value => value === ' ' ? '' : '<'),
    );
    if (!/^P[A-Z<][A-Z<]{42}$/.test(first) || !/^[A-Z0-9<]{44}$/.test(second)) continue;
    if (!checkMrzDigit(second.slice(0, 9), second[9]) ||
        !checkMrzDigit(second.slice(13, 19), second[19]) ||
        !checkMrzDigit(second.slice(21, 27), second[27]) ||
        !checkMrzDigit(second.slice(0, 10) + second.slice(13, 20) + second.slice(21, 43), second[43])) continue;

    const [family, given] = first.slice(5).replace(/<+$/, '').split('<<');
    const name = normalizeIdentityField([given, family].filter(Boolean).join(' ').replace(/<+/g, ' '), 120);
    if (!name) continue;
    return { name, nationality: normalizeIdentityField(second.slice(10, 13).replace(/</g, ''), 70) ?? '' };
  }
  return null;
}

function labelValue(lines: string[], label: RegExp, limit: number) {
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(label);
    // Recognize explicit labels only. Other layouts require visual review.
    if (match) return normalizeIdentityField(match[1] || lines[index + 1] || '', limit) ?? '';
  }
  return '';
}

/** Text is transient. Return only the two approved fields, never raw OCR or MRZ. */
export function extractIdentityDraft(text: string): IdentityReviewFields {
  const lines = text.slice(0, 20_000).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const passport = passportFields(lines);
  if (passport) return passport;
  const fullName = labelValue(lines, /^(?:full name|name|الاسم الكامل|الإسم الكامل|الاسم|الإسم)\s*(?::\s*(.*))?$/iu, 120);
  const surname = labelValue(lines, /^(?:surname|family name)\s*(?::\s*(.*))?$/iu, 80);
  const given = labelValue(lines, /^(?:given names?|first name)\s*(?::\s*(.*))?$/iu, 80);
  const nationality = labelValue(lines, /^(?:nationality|الجنسية)\s*(?::\s*(.*))?$/iu, 70);
  return { name: fullName || (given && surname ? normalizeIdentityField(`${given} ${surname}`, 120) ?? '' : ''), nationality };
}
