/**
 * Access-token storage.
 *
 * The token is deliberately kept in memory only — it is never written to disk.
 * A session therefore cannot outlive the app process: closing the app (swiping
 * it away from the recents screen, or the OS reclaiming it) drops this module's
 * state, so the next launch always lands on the login screen. Merely
 * backgrounding the app keeps the session, because the process — and with it
 * this module — stay alive.
 */

let token: string | null = null;

export async function getToken(): Promise<string | null> {
  return token;
}

export async function setToken(next: string): Promise<void> {
  token = next;
}

export async function clearToken(): Promise<void> {
  token = null;
}
