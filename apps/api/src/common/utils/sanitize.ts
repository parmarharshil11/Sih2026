export function sanitizeString(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/[<>]/g, '')           // strip angle brackets (XSS)
    .replace(/['"`;\\]/g, '')       // strip SQL meta-chars
    .replace(/\.\.\//g, '')         // strip path traversal
    .trim();
}
