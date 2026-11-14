const quotedPrintableBytes = (value: string) => {
  const bytes = Array.from(value.matchAll(/=([\da-f]{2})|([^=])/gi), ([, hex, plain]) =>
    hex ? parseInt(hex, 16) : plain.charCodeAt(0),
  );
  return Uint8Array.from(bytes);
};

const decodeArabicNameRun = (run: string) => {
  const completeBytes = run.replace(/=[\da-f]?$/i, '');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let decoded: string;
  try {
    decoded = decoder.decode(quotedPrintableBytes(completeBytes), { stream: true });
  } catch {
    return run;
  }
  if (!/\p{Script=Arabic}/u.test(decoded)) return run;

  // A legacy import may have cut the last escape or UTF-8 character.
  let truncated = completeBytes !== run;
  try {
    decoder.decode();
  } catch {
    truncated = true;
  }
  return truncated ? `${decoded.trimEnd()}…` : decoded;
};

export const customerDisplayName = (value?: string | null): string => {
  if (!value) return '';
  return value
    .replace(/=\?utf-8\?q\?((?:=[\da-f]{2}|[!-<>-~])+)\?=(?:[ \t]+(?==\?utf-8\?q\?))?/gi,
      (encodedWord, encoded: string) => {
        try {
          return new TextDecoder('utf-8', { fatal: true }).decode(quotedPrintableBytes(encoded.replace(/_/g, ' ')));
        } catch {
          return encodedWord;
        }
      })
    .replace(/(?:=[\da-f]{2}){2,}(?:=[\da-f]?(?=\s*$))?/gi, decodeArabicNameRun);
};
