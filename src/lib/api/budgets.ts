/** Monthly budget endpoints (`/api/v1/budgets`). */

import type { Budget } from '@/lib/types';

import { api } from './client';
import { listExpenses } from './expenses';
import { budgetCreatePayload, toAppBudget } from './mappers';
import type { CategoryWithExpenses, MonthlyBudgetRead, MonthlyBudgetWithCategories } from './types';

export interface ListBudgetsParams {
  year?: number;
  month?: number;
}

/** `GET /budgets` — budgets for an optional year/month, each carrying `total_spent`. */
export async function listBudgets(params: ListBudgetsParams = {}): Promise<MonthlyBudgetRead[]> {
  const { data } = await api.get<MonthlyBudgetRead[]>('/budgets', { params });
  return data;
}

/** `GET /budgets/current` — current month's budgets with nested categories. */
export async function getCurrentBudgets(): Promise<MonthlyBudgetWithCategories[]> {
  const { data } = await api.get<MonthlyBudgetWithCategories[]>('/budgets/current');
  return data;
}

/** `GET /budgets/{budget_id}` — one budget with nested categories. */
export async function getBudget(budgetId: string): Promise<MonthlyBudgetWithCategories> {
  const { data } = await api.get<MonthlyBudgetWithCategories>(`/budgets/${budgetId}`);
  return data;
}

/** `GET /budgets/{budget_id}/daily?date=` — per-category panel for one day. */
export async function getBudgetDaily(budgetId: string, date: string): Promise<CategoryWithExpenses[]> {
  const { data } = await api.get<CategoryWithExpenses[]>(`/budgets/${budgetId}/daily`, { params: { date } });
  return data;
}

/** `POST /budgets` */
export async function createBudget(budget: Budget): Promise<Budget> {
  const { data } = await api.post<MonthlyBudgetRead>('/budgets', budgetCreatePayload(budget));
  return toAppBudget({ ...data, categories: [] });
}

/** `PUT /budgets/{budget_id}` */
export async function updateBudget(budget: Budget): Promise<void> {
  await api.put(`/budgets/${budget.id}`, budgetCreatePayload(budget));
}

/** `DELETE /budgets/{budget_id}` */
export async function deleteBudget(budgetId: string): Promise<void> {
  await api.delete(`/budgets/${budgetId}`);
}

/**
 * Compose everything the month view needs from the routes above: the month's
 * budgets, each budget's categories, and each budget's expenses for the month
 * (attached to their category so the existing derived helpers keep working).
 */
export async function fetchMonthBudgets(year: number, month: number): Promise<Budget[]> {
  const summaries = await listBudgets({ year, month });
  if (summaries.length === 0) return [];
  const [details, expenseLists] = await Promise.all([
    Promise.all(summaries.map((b) => getBudget(b.id))),
    Promise.all(summaries.map((b) => listExpenses({ budget_id: b.id, year, month, limit: 1000 }))),
  ]);
  return details.map((detail, i) => toAppBudget(detail, expenseLists[i]));
}
