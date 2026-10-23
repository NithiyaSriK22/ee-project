import crypto from 'node:crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export function toUuid(input?: string | null): string {
  if (!input) {
    return crypto.randomUUID();
  }
  if (isUuid(input)) {
    return input;
  }
  const h = crypto.createHash('md5').update(input).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function toUuidOrNull(input?: string | null): string | null {
  if (!input) return null;
  return toUuid(input);
}
