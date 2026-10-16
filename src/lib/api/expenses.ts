/** Expense endpoints (`/api/v1/expenses`). */

import type { Expense } from '@/lib/types';

import { api } from './client';
import { expensePayload } from './mappers';
import type { ExpenseListParams, ExpenseRead } from './types';

/** `POST /expenses` */
export async function createExpense(categoryId: string, expense: Expense): Promise<ExpenseRead> {
  const { data } = await api.post<ExpenseRead>('/expenses', expensePayload(expense, categoryId));
  return data;
}

/** `GET /expenses` */
export async function listExpenses(params: ExpenseListParams = {}): Promise<ExpenseRead[]> {
  const { data } = await api.get<ExpenseRead[]>('/expenses', { params });
  return data;
}

/** `GET /expenses/{expense_id}` */
export async function getExpense(expenseId: string): Promise<ExpenseRead> {
  const { data } = await api.get<ExpenseRead>(`/expenses/${expenseId}`);
  return data;
}

/** `PUT /expenses/{expense_id}` — also used to reassign the expense's category. */
export async function updateExpense(expense: Expense, categoryId: string): Promise<ExpenseRead> {
  const { data } = await api.put<ExpenseRead>(`/expenses/${expense.id}`, expensePayload(expense, categoryId));
  return data;
}

/** `DELETE /expenses/{expense_id}` */
export async function deleteExpense(expenseId: string): Promise<void> {
  await api.delete(`/expenses/${expenseId}`);
}
