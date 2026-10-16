/** Health probe (`GET /health`) — lives outside the `/api/v1` prefix. */

import { api } from './client';
import { API_ORIGIN } from './env';

export async function getHealth(): Promise<{ status: string }> {
  const { data } = await api.get<{ status: string }>('/health', { baseURL: API_ORIGIN });
  return data;
}
