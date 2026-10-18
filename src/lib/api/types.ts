/**
 * Backend DTOs, mirroring the OpenAPI schemas. Money is serialized as strings
 * and timestamps are ISO 8601, exactly as the API documents.
 */

import type { Currency } from '@/lib/types';

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface MonthlyBudgetRead {
  name: string;
  month: number;
  year: number;
  total_limit: string;
  currency: Currency;
  id: string;
  user_id: string;
  total_spent: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryRead {
  id: string;
  name: string;
  daily_limit: string;
  reminder_time: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyBudgetWithCategories extends MonthlyBudgetRead {
  categories: CategoryRead[];
}

export interface DailyCategoryRead {
  name: string;
  daily_limit: string;
  reminder_time: string | null;
  icon: string | null;
  id: string;
  monthly_budget_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRead {
  daily_category_id: string;
  amount: string;
  note: string | null;
  spent_at: string;
  id: string;
  spent_date: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyBudgetCreate {
  name: string;
  month: number;
  year: number;
  total_limit: string;
  currency: Currency;
}

export interface MonthlyBudgetUpdate {
  name?: string;
  month?: number;
  year?: number;
  total_limit?: string;
  currency?: Currency;
}

export interface DailyCategoryCreate {
  name: string;
  daily_limit: string;
  reminder_time?: string | null;
  icon?: string | null;
}

export interface DailyCategoryUpdate {
  name?: string;
  daily_limit?: string;
  reminder_time?: string | null;
  icon?: string | null;
}

export interface ExpenseCreate {
  daily_category_id: string;
  amount: string;
  note?: string | null;
  spent_at?: string;
}

export interface ExpenseUpdate {
  amount?: string;
  note?: string | null;
  daily_category_id?: string;
  spent_at?: string;
}

export interface ExpenseListParams {
  category_id?: string;
  budget_id?: string;
  start_date?: string;
  end_date?: string;
  month?: number;
  year?: number;
  budget_name?: string;
  limit?: number;
  offset?: number;
}
