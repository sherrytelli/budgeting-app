/** Number/money/time formatting, ported from the reference app.js. */

import type { Currency } from './types';

/**
 * Same output as `(Math.round(n * 100) / 100).toLocaleString('en-US')`,
 * implemented without Intl so it behaves identically on every engine.
 */
export const fmtNum = (n: number) => {
  const r = Math.round(n * 100) / 100;
  const [int, frac] = r.toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (frac === '00') return grouped;
  return `${grouped}.${frac.replace(/0$/, '')}`;
};

export const money = (n: number, cur: Currency) => (cur === 'USD' ? '$' : 'Rs ') + fmtNum(n);
export const curSym = (cur: Currency) => (cur === 'USD' ? '$' : 'Rs');

export const fmtTime = (mins: number) => {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};

export const nowMins = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
