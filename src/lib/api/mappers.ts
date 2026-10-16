/**
 * Translation between the backend DTOs and the app's local view models
 * (`Budget` / `Category` / `Expense`), so the existing UI keeps working
 * unchanged.
 *
 * Time handling: the app stores a wall-clock `date` (YYYY-MM-DD) plus `time`
 * in minutes since midnight. The API stores an *aware* `spent_at`. Writes send
 * the device's local datetime with its UTC offset (naive timestamps are
 * rejected by the API); reads convert the returned instant back to device-local
 * wall-clock values.
 */

import { pad } from '@/lib/dates';
import type { Budget, Category, Currency, Expense } from '@/lib/types';
import type {
  CategoryRead,
  DailyCategoryRead,
  ExpenseRead,
  MonthlyBudgetWithCategories,
} from './types';

const DEFAULT_ICON = 'basket';

/* ---------- time helpers ---------- */

/** `Date` -> ISO 8601 with the device's UTC offset, e.g. `2026-10-12T12:30:00+05:00`. */
export function toIsoWithOffset(d: Date): string {
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${date}T${time}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** App expense (date + minutes) -> aware ISO `spent_at` in device-local time. */
export function expenseSpentAt(e: Expense): string {
  const [y, m, d] = e.date.split('-').map(Number);
  return toIsoWithOffset(new Date(y, m - 1, d, Math.floor(e.time / 60), e.time % 60, 0, 0));
}

/** Aware ISO `spent_at` -> device-local wall-clock date + minutes. */
export function spentAtToLocal(iso: string): { date: string; time: number } {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { date, time: d.getHours() * 60 + d.getMinutes() };
}

/** `HH:MM:SS` -> minutes since midnight. */
export function reminderToMinutes(value: string | null): number | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** Minutes since midnight -> `HH:MM:00`. */
export function minutesToReminder(minutes: number | null): string | null {
  if (minutes == null) return null;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;
}

export function splitMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

export function monthKeyOfParts(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

/* ---------- DTO -> app ---------- */

export function toAppExpense(dto: ExpenseRead): Expense {
  const { date, time } = spentAtToLocal(dto.spent_at);
  return {
    id: dto.id,
    date,
    note: dto.note ?? '',
    amount: Number(dto.amount),
    time,
  };
}

export function toAppCategory(dto: CategoryRead, expenses: Expense[] = []): Category {
  return {
    id: dto.id,
    name: dto.name,
    dailyLimit: Number(dto.daily_limit),
    reminder: reminderToMinutes(dto.reminder_time),
    icon: dto.icon ?? DEFAULT_ICON,
    expenses,
  };
}

export function toAppCategoryFromDaily(dto: DailyCategoryRead): Category {
  return {
    id: dto.id,
    name: dto.name,
    dailyLimit: Number(dto.daily_limit),
    reminder: reminderToMinutes(dto.reminder_time),
    icon: dto.icon ?? DEFAULT_ICON,
    expenses: [],
  };
}

export function toAppBudget(dto: MonthlyBudgetWithCategories, expenses: ExpenseRead[] = []): Budget {
  const byCategory = new Map<string, Expense[]>();
  for (const e of expenses) {
    const list = byCategory.get(e.daily_category_id);
    if (list) list.push(toAppExpense(e));
    else byCategory.set(e.daily_category_id, [toAppExpense(e)]);
  }
  return {
    id: dto.id,
    name: dto.name,
    monthKey: monthKeyOfParts(dto.year, dto.month),
    amount: Number(dto.total_limit),
    currency: dto.currency,
    categories: dto.categories.map((c) => toAppCategory(c, byCategory.get(c.id) ?? [])),
  };
}

/* ---------- app -> DTO payloads ---------- */

export function budgetCreatePayload(b: Budget) {
  const { month, year } = splitMonthKey(b.monthKey);
  return {
    name: b.name,
    month,
    year,
    total_limit: b.amount.toFixed(2),
    currency: b.currency as Currency,
  };
}

export function categoryCreatePayload(c: Category) {
  return {
    name: c.name,
    daily_limit: c.dailyLimit.toFixed(2),
    reminder_time: minutesToReminder(c.reminder),
    icon: c.icon || null,
  };
}

export function categoryUpdatePayload(c: Category) {
  return {
    name: c.name,
    daily_limit: c.dailyLimit.toFixed(2),
    reminder_time: minutesToReminder(c.reminder),
    icon: c.icon || null,
  };
}

export function expensePayload(e: Expense, categoryId: string) {
  return {
    daily_category_id: categoryId,
    amount: e.amount.toFixed(2),
    note: e.note || null,
    spent_at: expenseSpentAt(e),
  };
}
