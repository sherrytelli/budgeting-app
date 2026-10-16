/** Daily category endpoints and the reminders route. */

import type { Category } from '@/lib/types';

import { api } from './client';
import { categoryCreatePayload, categoryUpdatePayload } from './mappers';
import type { DailyCategoryRead } from './types';

/** `POST /budgets/{budget_id}/categories` */
export async function createCategory(budgetId: string, category: Category): Promise<DailyCategoryRead> {
  const { data } = await api.post<DailyCategoryRead>(
    `/budgets/${budgetId}/categories`,
    categoryCreatePayload(category),
  );
  return data;
}

/** `GET /budgets/{budget_id}/categories` */
export async function listCategories(budgetId: string): Promise<DailyCategoryRead[]> {
  const { data } = await api.get<DailyCategoryRead[]>(`/budgets/${budgetId}/categories`);
  return data;
}

/** `PUT /categories/{category_id}` */
export async function updateCategory(category: Category): Promise<DailyCategoryRead> {
  const { data } = await api.put<DailyCategoryRead>(`/categories/${category.id}`, categoryUpdatePayload(category));
  return data;
}

/** `DELETE /categories/{category_id}` */
export async function deleteCategory(categoryId: string): Promise<void> {
  await api.delete(`/categories/${categoryId}`);
}

/** `GET /reminders` — categories with a reminder set for a month. */
export async function getReminders(month?: number, year?: number): Promise<DailyCategoryRead[]> {
  const { data } = await api.get<DailyCategoryRead[]>('/reminders', { params: { month, year } });
  return data;
}
