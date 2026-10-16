/**
 * App state store. Server state (budgets, categories, expenses) is owned by
 * TanStack Query and loaded from the backend; this provider keeps the reference
 * app's view state (monthKey / budgetIdx / selectedDate / windowStart /
 * expandedCat) and exposes the same mutation API the UI already calls, so the
 * screens and sheets stay unchanged.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as budgetsApi from '@/lib/api/budgets';
import * as categoriesApi from '@/lib/api/categories';
import * as expensesApi from '@/lib/api/expenses';
import { splitMonthKey } from '@/lib/api/mappers';
import { useAuth } from '@/lib/auth';
import { initWindow, keyOf, monthKeyOf, today } from '@/lib/dates';
import type { Budget, Category, Expense } from '@/lib/types';

export interface AppState {
  budgets: Budget[];
  monthKey: string;
  budgetIdx: number;
  selectedDate: string;
  windowStart: Date;
  expandedCat: string | null;
}

export interface AppApi extends AppState {
  hydrated: boolean;
  /** True once the viewed month's budgets have been fetched at least once. */
  budgetsLoaded: boolean;
  monthBudgets(): Budget[];
  activeBudget(): Budget | null;
  selectDate(k: string): void;
  switchMonth(mk: string): void;
  setWindowStart(d: Date): void;
  setBudgetIdx(i: number): void;
  toggleExpanded(catId: string): void;
  setExpandedCat(id: string | null): void;
  /** Resets the view to the current month, like the reference's enterApp(). */
  enterMonth(): void;
  addBudget(b: Budget): Promise<Budget>;
  updateBudget(b: Budget): void;
  deleteBudget(id: string): void;
  /** Points the view at the given budget inside its month, after create/edit. */
  focusBudget(monthKey: string, budgetId: string): void;
  addCategory(budgetId: string, c: Category): void;
  updateCategory(budgetId: string, c: Category): void;
  deleteCategory(budgetId: string, catId: string): void;
  addExpense(budgetId: string, catId: string, e: Expense): void;
  updateExpense(budgetId: string, expense: Expense, newCatId: string): void;
  deleteExpense(budgetId: string, catId: string, expenseId: string): void;
}

const budgetKeys = {
  all: ['budgets'] as const,
  month: (monthKey: string) => ['budgets', monthKey] as const,
};

const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

const initialMonth = monthKeyOf(today());
const initialDate = keyOf(today());

interface ViewState {
  monthKey: string;
  budgetIdx: number;
  selectedDate: string;
  windowStart: Date;
  expandedCat: string | null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { ready, token } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewState>(() => ({
    monthKey: initialMonth,
    budgetIdx: 0,
    selectedDate: initialDate,
    windowStart: initWindow(initialMonth, initialDate),
    expandedCat: null,
  }));

  const { year, month } = useMemo(() => splitMonthKey(view.monthKey), [view.monthKey]);

  const budgetsQuery = useQuery({
    queryKey: budgetKeys.month(view.monthKey),
    queryFn: () => budgetsApi.fetchMonthBudgets(year, month),
    enabled: !!token && Number.isFinite(year) && Number.isFinite(month),
    staleTime: 30_000,
  });

  const budgets = useMemo(() => budgetsQuery.data ?? [], [budgetsQuery.data]);
  const budgetsLoaded = budgetsQuery.isFetched;

  const invalidateBudgets = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
  }, [queryClient]);

  const createBudgetMutation = useMutation({ mutationFn: (b: Budget) => budgetsApi.createBudget(b), onSuccess: invalidateBudgets });
  const updateBudgetMutation = useMutation({ mutationFn: (b: Budget) => budgetsApi.updateBudget(b), onSuccess: invalidateBudgets });
  const deleteBudgetMutation = useMutation({ mutationFn: (id: string) => budgetsApi.deleteBudget(id), onSuccess: invalidateBudgets });
  const createCategoryMutation = useMutation({
    mutationFn: (vars: { budgetId: string; category: Category }) => categoriesApi.createCategory(vars.budgetId, vars.category),
    onSuccess: invalidateBudgets,
  });
  const updateCategoryMutation = useMutation({ mutationFn: (c: Category) => categoriesApi.updateCategory(c), onSuccess: invalidateBudgets });
  const deleteCategoryMutation = useMutation({ mutationFn: (id: string) => categoriesApi.deleteCategory(id), onSuccess: invalidateBudgets });
  const createExpenseMutation = useMutation({
    mutationFn: (vars: { categoryId: string; expense: Expense }) => expensesApi.createExpense(vars.categoryId, vars.expense),
    onSuccess: invalidateBudgets,
  });
  const updateExpenseMutation = useMutation({
    mutationFn: (vars: { expense: Expense; categoryId: string }) => expensesApi.updateExpense(vars.expense, vars.categoryId),
    onSuccess: invalidateBudgets,
  });
  const deleteExpenseMutation = useMutation({ mutationFn: (id: string) => expensesApi.deleteExpense(id), onSuccess: invalidateBudgets });

  // The list can shrink under us (a budget moved month) — clamp for display
  // rather than writing back to state from an effect.
  const effectiveIdx = Math.min(view.budgetIdx, Math.max(0, budgets.length - 1));

  const monthBudgets = useCallback(
    () => budgets.filter((b) => b.monthKey === view.monthKey),
    [budgets, view.monthKey],
  );
  const activeBudget = useCallback(() => monthBudgets()[effectiveIdx] || null, [monthBudgets, effectiveIdx]);

  const selectDate = useCallback((k: string) => {
    setView((v) => (k === v.selectedDate ? v : { ...v, selectedDate: k, expandedCat: null }));
  }, []);

  const switchMonth = useCallback((mk: string) => {
    setView((v) => ({
      ...v,
      monthKey: mk,
      selectedDate: monthKeyOf(today()) === mk ? keyOf(today()) : `${mk}-01`,
      budgetIdx: 0,
      expandedCat: null,
      windowStart: initWindow(mk, monthKeyOf(today()) === mk ? keyOf(today()) : `${mk}-01`),
    }));
  }, []);

  const setWindowStart = useCallback((d: Date) => setView((v) => ({ ...v, windowStart: d })), []);
  const setBudgetIdx = useCallback(
    (i: number) => setView((v) => (i === v.budgetIdx ? v : { ...v, budgetIdx: i, expandedCat: null })),
    [],
  );
  const toggleExpanded = useCallback(
    (catId: string) => setView((v) => ({ ...v, expandedCat: v.expandedCat === catId ? null : catId })),
    [],
  );
  const setExpandedCat = useCallback((id: string | null) => setView((v) => ({ ...v, expandedCat: id })), []);

  const enterMonth = useCallback(() => {
    const mk = monthKeyOf(today());
    const dk = keyOf(today());
    setView((v) => ({ ...v, monthKey: mk, selectedDate: dk, budgetIdx: 0, expandedCat: null, windowStart: initWindow(mk, dk) }));
  }, []);

  // A freshly created budget may not be in the fetched list yet: switch to its
  // month immediately, then point the carousel at it once that month's data is
  // available (the fetch also seeds the query cache the screen reads from).
  const focusBudget = useCallback(
    (mk: string, budgetId: string) => {
      const selectedDate = monthKeyOf(today()) === mk ? keyOf(today()) : `${mk}-01`;
      setView((v) => ({ ...v, monthKey: mk, selectedDate, budgetIdx: 0, expandedCat: null, windowStart: initWindow(mk, selectedDate) }));
      const { year: y, month: m } = splitMonthKey(mk);
      void queryClient
        .fetchQuery({ queryKey: budgetKeys.month(mk), queryFn: () => budgetsApi.fetchMonthBudgets(y, m), staleTime: 0 })
        .then((list) => {
          const idx = list.findIndex((b) => b.id === budgetId);
          if (idx >= 0) setView((v) => (v.monthKey === mk ? { ...v, budgetIdx: idx } : v));
        })
        .catch(() => {});
    },
    [queryClient],
  );

  const addBudget = (b: Budget) => createBudgetMutation.mutateAsync(b);
  const updateBudget = (b: Budget) => {
    updateBudgetMutation.mutate(b);
  };
  const deleteBudget = (id: string) => {
    deleteBudgetMutation.mutate(id);
  };
  const addCategory = (budgetId: string, c: Category) => {
    createCategoryMutation.mutate({ budgetId, category: c });
  };
  const updateCategory = (_budgetId: string, c: Category) => {
    updateCategoryMutation.mutate(c);
  };
  const deleteCategory = (_budgetId: string, catId: string) => {
    deleteCategoryMutation.mutate(catId);
  };
  const addExpense = (_budgetId: string, catId: string, e: Expense) => {
    createExpenseMutation.mutate({ categoryId: catId, expense: e });
  };
  const updateExpense = (_budgetId: string, expense: Expense, newCatId: string) => {
    updateExpenseMutation.mutate({ expense, categoryId: newCatId });
  };
  const deleteExpense = (_budgetId: string, _catId: string, expenseId: string) => {
    deleteExpenseMutation.mutate(expenseId);
  };

  const api: AppApi = {
    budgets,
    monthKey: view.monthKey,
    budgetIdx: effectiveIdx,
    selectedDate: view.selectedDate,
    windowStart: view.windowStart,
    expandedCat: view.expandedCat,
    hydrated: ready && (token ? budgetsLoaded : true),
    budgetsLoaded,
    monthBudgets,
    activeBudget,
    selectDate,
    switchMonth,
    setWindowStart,
    setBudgetIdx,
    toggleExpanded,
    setExpandedCat,
    enterMonth,
    addBudget,
    updateBudget,
    deleteBudget,
    focusBudget,
    addCategory,
    updateCategory,
    deleteCategory,
    addExpense,
    updateExpense,
    deleteExpense,
  };

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

/* ---------- derived value helpers, ported from app.js ---------- */

export const budgetSpent = (b: Budget) =>
  b.categories.reduce((s, c) => s + c.expenses.reduce((x, e) => x + e.amount, 0), 0);

export const daySpent = (c: Category, dk: string) =>
  c.expenses.filter((e) => e.date === dk).reduce((s, e) => s + e.amount, 0);
