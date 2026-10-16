/** Authentication endpoints (`/api/v1/auth`). Registration is intentionally not wired. */

import { api } from './client';
import type { TokenResponse, UserRead } from './types';

/** OAuth2 password flow: `application/x-www-form-urlencoded` with email as `username`. */
export async function login(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);
  const { data } = await api.post<TokenResponse>('/auth/login', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function getMe(): Promise<UserRead> {
  const { data } = await api.get<UserRead>('/auth/me');
  return data;
}
