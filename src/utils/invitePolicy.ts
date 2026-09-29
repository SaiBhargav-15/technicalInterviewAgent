export const ASSESSMENT_INVITE_VALIDITY_MS = 24 * 60 * 60 * 1000;

export function clampInviteExpiry(createdAt: string, existingExpiry?: string): string {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return new Date(0).toISOString();

  const maximumExpiryMs = createdAtMs + ASSESSMENT_INVITE_VALIDITY_MS;
  const existingExpiryMs = existingExpiry ? Date.parse(existingExpiry) : Number.NaN;
  const effectiveExpiryMs = Number.isFinite(existingExpiryMs)
    ? Math.min(existingExpiryMs, maximumExpiryMs)
    : maximumExpiryMs;
  return new Date(effectiveExpiryMs).toISOString();
}

export function isInviteExpired(expiresAt: string, now = Date.now()): boolean {
  const expiryMs = Date.parse(expiresAt);
  return !Number.isFinite(expiryMs) || now >= expiryMs;
}