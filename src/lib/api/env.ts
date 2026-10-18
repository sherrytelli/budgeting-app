/**
 * Backend configuration. The base URL is never hardcoded — it comes from the
 * `EXPO_PUBLIC_BACKEND_URL` environment variable in `.env` (inlined at build
 * time by Expo). A missing scheme is tolerated so values like
 * `192.168.18.195:8000/api/v1` work without editing `.env`.
 */

const RAW = process.env.EXPO_PUBLIC_BACKEND_URL;

function resolveBaseUrl(): string {
  if (!RAW || !RAW.trim()) {
    throw new Error('EXPO_PUBLIC_BACKEND_URL is not set. Add it to your .env file.');
  }
  const trimmed = RAW.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export const API_BASE_URL = resolveBaseUrl();
