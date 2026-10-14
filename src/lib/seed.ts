/** Seed data, ported 1:1 from the reference app.js seed(). */

import { keyOf, monthKeyOf, pad, today } from './dates';
import { uid } from './format';
import type { Budget, Expense } from './types';

export function seedBudgets(): Budget[] {
  const t = today();
  const y = t.getFullYear();
  const m = t.getMonth();
  const day = (n: number) => keyOf(new Date(y, m, Math.max(1, Math.min(n, t.getDate()))));
  const rel = (k: number) => day(t.getDate() + k);
  const pm = m === 0 ? 11 : m - 1;
  const py = m === 0 ? y - 1 : y;
  const pday = (n: number) => keyOf(new Date(py, pm, n));
  const exp = (date: string, note: string, amount: number, mins: number): Expense => ({
    id: uid(), date, note, amount, time: mins,
  });

  const regular: Budget = {
    id: uid(), name: 'Regular', monthKey: monthKeyOf(t), amount: 100000, currency: 'PKR',
    categories: [
      {
        id: uid(), name: 'Rent', dailyLimit: 50000, reminder: null, icon: 'house',
        expenses: [exp(day(1), 'Monthly rent', 25000, 605)],
      },
      {
        id: uid(), name: 'Groceries', dailyLimit: 1500, reminder: null, icon: 'basket',
        expenses: [exp(day(5), 'Monthly stock-up', 8600, 1120), exp(rel(-2), 'Weekly groceries', 1250, 1050)],
      },
      {
        id: uid(), name: 'Food', dailyLimit: 500, reminder: 780, icon: 'utensils',
        expenses: [
          exp(rel(0), 'Lunch at office', 150, 810), exp(rel(0), 'Evening tea', 50, 975),
          exp(rel(-1), 'Breakfast', 120, 540), exp(rel(-1), 'Dinner with friends', 200, 1245),
          exp(rel(-2), 'Home-cooked meal', 180, 1170),
          exp(day(6), 'Weekend brunch', 450, 690), exp(day(3), 'Restaurant dinner', 380, 1275),
        ],
      },
      {
        id: uid(), name: 'Transport', dailyLimit: 300, reminder: null, icon: 'bus',
        expenses: [exp(rel(0), 'Cab to meeting', 270, 555), exp(rel(-1), 'Bus fare', 60, 1110), exp(day(5), 'Ride share', 240, 840)],
      },
      {
        id: uid(), name: 'Coffee', dailyLimit: 100, reminder: null, icon: 'coffee',
        expenses: [exp(rel(0), 'Morning latte', 150, 510), exp(rel(-1), 'Cappuccino', 90, 1185), exp(day(7), 'Espresso', 80, 615)],
      },
      {
        id: uid(), name: 'Utilities', dailyLimit: 5000, reminder: null, icon: 'bulb',
        expenses: [exp(day(4), 'Electricity bill', 2200, 660), exp(day(7), 'Internet bill', 1800, 750)],
      },
      {
        id: uid(), name: 'Shopping', dailyLimit: 2000, reminder: null, icon: 'bag',
        expenses: [exp(day(6), 'New shoes', 3500, 1005)],
      },
    ],
  };

  const vacation: Budget = {
    id: uid(), name: 'Vacation', monthKey: monthKeyOf(t), amount: 60000, currency: 'PKR',
    categories: [
      {
        id: uid(), name: 'Stay', dailyLimit: 5000, reminder: null, icon: 'house',
        expenses: [exp(rel(-1), 'Hotel booking', 4500, 1020)],
      },
      {
        id: uid(), name: 'Food', dailyLimit: 800, reminder: null, icon: 'utensils',
        expenses: [exp(rel(-1), 'Dinner out', 650, 1230)],
      },
      {
        id: uid(), name: 'Travel', dailyLimit: 1000, reminder: null, icon: 'bus',
        expenses: [exp(rel(-2), 'Train tickets', 1800, 540)],
      },
    ],
  };

  const prevRegular: Budget = {
    id: uid(), name: 'Regular', monthKey: `${py}-${pad(pm + 1)}`, amount: 80000, currency: 'PKR',
    categories: [
      {
        id: uid(), name: 'Food', dailyLimit: 500, reminder: null, icon: 'utensils',
        expenses: [exp(pday(12), 'Lunch', 220, 795), exp(pday(8), 'Dinner', 310, 1200)],
      },
      {
        id: uid(), name: 'Transport', dailyLimit: 300, reminder: null, icon: 'bus',
        expenses: [exp(pday(12), 'Ride share', 190, 585)],
      },
      {
        id: uid(), name: 'Coffee', dailyLimit: 100, reminder: null, icon: 'coffee',
        expenses: [exp(pday(15), 'Espresso', 140, 500)],
      },
    ],
  };

  const tripFund: Budget = {
    id: uid(), name: 'Trip Fund', monthKey: `${py}-${pad(pm + 1)}`, amount: 500, currency: 'USD',
    categories: [
      {
        id: uid(), name: 'Food', dailyLimit: 25, reminder: null, icon: 'utensils',
        expenses: [exp(pday(10), 'Snacks', 18, 930)],
      },
      {
        id: uid(), name: 'Transport', dailyLimit: 15, reminder: null, icon: 'bus',
        expenses: [exp(pday(10), 'Metro pass', 12, 540)],
      },
    ],
  };

  return [regular, vacation, prevRegular, tripFund];
}
