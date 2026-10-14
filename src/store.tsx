/**
 * App state store — port of the reference app.js `state` object and its
 * mutation logic. Budgets persist through the storage layer; the rest mirrors
 * the reference's monthKey / budgetIdx / selectedDate / windowStart /
 * expandedCat view state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { initWindow, keyOf, monthKeyOf, today } from '@/lib/dates';
import { loadBudgets, saveBudgets } from '@/lib/storage';
import { seedBudgets } from '@/lib/seed';
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
  addBudget(b: Budget): void;
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

const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

const initialMonth = monthKeyOf(today());
const initialDate = keyOf(today());

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => ({
    budgets: [],
    monthKey: initialMonth,
    budgetIdx: 0,
    selectedDate: initialDate,
    windowStart: initWindow(initialMonth, initialDate),
    expandedCat: null,
  }));
  const [hydrated, setHydrated] = useState(false);
  const loadedRef = useRef(false);

  // Boot: load stored budgets or seed, exactly like the reference's boot().
  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await loadBudgets();
      if (!mounted) return;
      if (stored) {
        setState((s) => ({ ...s, budgets: stored }));
      } else {
        const seeded = seedBudgets();
        saveBudgets(seeded);
        setState((s) => ({ ...s, budgets: seeded }));
      }
      loadedRef.current = true;
      setHydrated(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist on every change after hydration, like the reference's store.save() in renderAll().
  useEffect(() => {
    if (loadedRef.current) saveBudgets(state.budgets);
  }, [state.budgets]);

  const monthBudgets = useCallback(
    () => state.budgets.filter((b) => b.monthKey === state.monthKey),
    [state.budgets, state.monthKey],
  );
  const activeBudget = useCallback(() => monthBudgets()[state.budgetIdx] || null, [monthBudgets, state.budgetIdx]);

  const selectDate = useCallback((k: string) => {
    setState((s) => (k === s.selectedDate ? s : { ...s, selectedDate: k, expandedCat: null }));
  }, []);

  const switchMonth = useCallback((mk: string) => {
    setState((s) => ({
      ...s,
      monthKey: mk,
      selectedDate: monthKeyOf(today()) === mk ? keyOf(today()) : `${mk}-01`,
      budgetIdx: 0,
      expandedCat: null,
      windowStart: initWindow(mk, monthKeyOf(today()) === mk ? keyOf(today()) : `${mk}-01`),
    }));
  }, []);

  const setWindowStart = useCallback((d: Date) => setState((s) => ({ ...s, windowStart: d })), []);
  const setBudgetIdx = useCallback(
    (i: number) => setState((s) => (i === s.budgetIdx ? s : { ...s, budgetIdx: i, expandedCat: null })),
    [],
  );
  const toggleExpanded = useCallback(
    (catId: string) =>
      setState((s) => ({ ...s, expandedCat: s.expandedCat === catId ? null : catId })),
    [],
  );
  const setExpandedCat = useCallback((id: string | null) => setState((s) => ({ ...s, expandedCat: id })), []);

  const enterMonth = useCallback(() => {
    const mk = monthKeyOf(today());
    const dk = keyOf(today());
    setState((s) => ({ ...s, monthKey: mk, selectedDate: dk, budgetIdx: 0, expandedCat: null, windowStart: initWindow(mk, dk) }));
  }, []);

  const mapBudget = useCallback((id: string, fn: (b: Budget) => Budget) => {
    setState((s) => ({ ...s, budgets: s.budgets.map((b) => (b.id === id ? fn(b) : b)) }));
  }, []);

  const addBudget = useCallback((b: Budget) => {
    setState((s) => ({ ...s, budgets: [...s.budgets, b] }));
  }, []);

  const updateBudget = useCallback((b: Budget) => {
    setState((s) => {
      const budgets = s.budgets.map((x) => (x.id === b.id ? b : x));
      // Clamp budgetIdx if this budget left the viewed month (renderAll() did this every pass).
      const list = budgets.filter((x) => x.monthKey === s.monthKey);
      const budgetIdx = s.budgetIdx >= list.length ? Math.max(0, list.length - 1) : s.budgetIdx;
      return { ...s, budgets, budgetIdx };
    });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      budgets: s.budgets.filter((x) => x.id !== id),
      budgetIdx: 0,
      expandedCat: null,
    }));
  }, []);

  const focusBudget = useCallback((mk: string, budgetId: string) => {
    setState((s) => {
      const selectedDate = monthKeyOf(today()) === mk ? keyOf(today()) : `${mk}-01`;
      const list = s.budgets.filter((b) => b.monthKey === mk);
      const idx = Math.max(0, list.findIndex((x) => x.id === budgetId));
      return { ...s, monthKey: mk, selectedDate, budgetIdx: idx, expandedCat: null, windowStart: initWindow(mk, selectedDate) };
    });
  }, []);

  const addCategory = useCallback(
    (budgetId: string, c: Category) =>
      mapBudget(budgetId, (b) => ({ ...b, categories: [...b.categories, c] })),
    [mapBudget],
  );

  const updateCategory = useCallback(
    (budgetId: string, c: Category) =>
      mapBudget(budgetId, (b) => ({
        ...b,
        categories: b.categories.map((x) => (x.id === c.id ? c : x)),
      })),
    [mapBudget],
  );

  const deleteCategory = useCallback(
    (budgetId: string, catId: string) => {
      mapBudget(budgetId, (b) => ({
        ...b,
        categories: b.categories.filter((c) => c.id !== catId),
      }));
      setState((s) => (s.expandedCat === catId ? { ...s, expandedCat: null } : s));
    },
    [mapBudget],
  );

  const addExpense = useCallback(
    (budgetId: string, catId: string, e: Expense) =>
      mapBudget(budgetId, (b) => ({
        ...b,
        categories: b.categories.map((c) => (c.id === catId ? { ...c, expenses: [...c.expenses, e] } : c)),
      })),
    [mapBudget],
  );

  // Handles a category switch on edit, like the reference's expense save handler.
  const updateExpense = useCallback(
    (budgetId: string, expense: Expense, newCatId: string) => {
      mapBudget(budgetId, (b) => {
        const oldCat = b.categories.find((c) => c.expenses.some((e) => e.id === expense.id));
        if (!oldCat) return b;
        const categories = b.categories.map((c) => {
          if (c.id === oldCat.id && oldCat.id !== newCatId) {
            return { ...c, expenses: c.expenses.filter((e) => e.id !== expense.id) };
          }
          if (c.id === oldCat.id) {
            return { ...c, expenses: c.expenses.map((e) => (e.id === expense.id ? expense : e)) };
          }
          return c;
        });
        if (oldCat.id === newCatId) return { ...b, categories };
        return {
          ...b,
          categories: categories.map((c) => (c.id === newCatId ? { ...c, expenses: [...c.expenses, expense] } : c)),
        };
      });
    },
    [mapBudget],
  );

  const deleteExpense = useCallback(
    (budgetId: string, catId: string, expenseId: string) =>
      mapBudget(budgetId, (b) => ({
        ...b,
        categories: b.categories.map((c) =>
          c.id === catId ? { ...c, expenses: c.expenses.filter((e) => e.id !== expenseId) } : c,
        ),
      })),
    [mapBudget],
  );

  const api: AppApi = {
    ...state,
    hydrated,
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
