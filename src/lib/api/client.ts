/**
 * Axios instance for the budgeting backend.
 *
 * - `baseURL` comes from the environment (see `env.ts`).
 * - The request interceptor attaches `Authorization: Bearer <token>` from
 *   secure storage.
 * - The response interceptor normalizes FastAPI error envelopes into a typed
 *   `ApiError` and notifies the auth layer when a token is rejected.
 */

import { create, type AxiosError } from 'axios';

import { API_BASE_URL } from './env';
import { getToken } from './token';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let onUnauthorized: (() => void) | null = null;

/** Registered by the auth provider so a rejected token can end the session. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export const api = create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

function messageFor(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const detail = (data as Record<string, unknown>).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return 'Validation error';
    const message = (data as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

function normalize(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  if (error.response) {
    return new ApiError(messageFor(error.response.data, `Request failed (${status})`), status, error.response.data);
  }
  return new ApiError(error.message || 'Network error', 0);
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status ?? 0;
    const url = error.config?.url ?? '';
    // A 401 from the login route means bad credentials, not an expired session.
    if (status === 401 && !url.includes('/auth/login')) onUnauthorized?.();
    return Promise.reject(normalize(error));
  },
);
