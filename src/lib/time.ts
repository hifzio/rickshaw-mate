const MIN = 60_000;

export const POST_TTL_MS = 15 * MIN;

export const minutesAgo = (postedAt: number, now: number) =>
  Math.max(0, Math.floor((now - postedAt) / MIN));

export const minutesLeft = (expiresAt: number, now: number) =>
  Math.max(0, Math.ceil((expiresAt - now) / MIN));
