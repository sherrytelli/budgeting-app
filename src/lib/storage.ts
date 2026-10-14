/**
 * Persistence layer. The reference app uses localStorage; React Native has no
 * localStorage, so native stores the same payloads in files via
 * expo-file-system while web keeps using localStorage verbatim.
 */

import { Platform } from 'react-native';

import type { Budget } from './types';

const DATA_KEY = 'bt_data_v1';
const SESSION_KEY = 'bt_session';
const DATA_FILE = 'bt_data_v1.json';
const SESSION_FILE = 'bt_session.txt';

let FileSystem: typeof import('expo-file-system') | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- platform-conditional native module
  FileSystem = require('expo-file-system') as typeof import('expo-file-system');
}

function fileFor(key: string): import('expo-file-system').File | null {
  if (!FileSystem) return null;
  const name = key === SESSION_KEY ? SESSION_FILE : DATA_FILE;
  return new FileSystem.File(FileSystem.Paths.document, name);
}

async function loadRaw(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    const file = fileFor(key);
    if (!file || !file.exists) return null;
    return file.textSync();
  } catch {
    return null;
  }
}

async function saveRaw(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    const file = fileFor(key);
    if (!file) return;
    if (!file.exists) file.create();
    file.write(value);
  } catch {
    // The reference app silently ignores storage failures; do the same.
  }
}

export async function loadBudgets(): Promise<Budget[] | null> {
  try {
    const raw = await loadRaw(DATA_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && Array.isArray(data.budgets) ? (data.budgets as Budget[]) : null;
  } catch {
    return null;
  }
}

export function saveBudgets(budgets: Budget[]): void {
  void saveRaw(DATA_KEY, JSON.stringify({ budgets }));
}

export function getSession(): Promise<string | null> {
  return loadRaw(SESSION_KEY);
}

export function setSession(value: string): Promise<void> {
  return saveRaw(SESSION_KEY, value);
}
