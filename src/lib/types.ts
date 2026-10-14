export type Currency = 'PKR' | 'USD';

export interface Expense {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  note: string;
  amount: number;
  /** Minutes since midnight. */
  time: number;
}

export interface Category {
  id: string;
  name: string;
  dailyLimit: number;
  /** Reminder time in minutes since midnight, or null. */
  reminder: number | null;
  icon: string;
  expenses: Expense[];
}

export interface Budget {
  id: string;
  name: string;
  /** YYYY-MM */
  monthKey: string;
  amount: number;
  currency: Currency;
  categories: Category[];
}
