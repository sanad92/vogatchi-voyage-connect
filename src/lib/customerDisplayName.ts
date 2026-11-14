const decodeBytes = (value: string) => {
  const bytes = Array.from(value.matchAll(/=([\da-f]{2})|([^=])/gi), ([, hex, plain]) =>
    hex ? parseInt(hex, 16) : plain.charCodeAt(0),
  );
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
};

export const customerDisplayName = (value?: string | null): string => {
  if (!value) return '';
  try {
    return value
      .replace(/=\?utf-8\?q\?((?:=[\da-f]{2}|[!-<>-~])+)\?=(?:[ \t]+(?==\?utf-8\?q\?))?/gi,
        (_, encoded: string) => decodeBytes(encoded.replace(/_/g, ' ')))
      .replace(/(?:=[\da-f]{2}){2,}/gi, (encoded) => {
        const decoded = decodeBytes(encoded);
        return /\p{Script=Arabic}/u.test(decoded) ? decoded : encoded;
      });
  } catch {
    return value;
  }
};
