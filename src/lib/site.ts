/**
 * Canonical site URL. Set NEXT_PUBLIC_SITE_URL to your custom domain once you have one.
 * On Vercel it falls back to the production domain, then the per-deployment URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "RickshawMate";
