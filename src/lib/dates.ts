/** Date helpers, ported 1:1 from the reference app.js. */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_L = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const fromKey = (k: string) => {
  const [y, m, dd] = k.split('-').map(Number);
  return new Date(y, m - 1, dd);
};
export const fromMonthKey = (k: string) => {
  const [y, m] = k.split('-').map(Number);
  return new Date(y, m - 1, 1);
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const today = () => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
};
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export const fmtDay = (k: string) => {
  const d = fromKey(k);
  return `${d.getDate()} ${MONTHS_S[d.getMonth()]}`;
};
export const fmtMonth = (mk: string) => {
  const d = fromMonthKey(mk);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** Initial 7-day window containing the selected date, clamped inside the month. */
export function initWindow(monthKey: string, selectedDate: string): Date {
  const mk = fromMonthKey(monthKey);
  const dim = daysInMonth(mk.getFullYear(), mk.getMonth());
  const first = mk;
  const last = new Date(mk.getFullYear(), mk.getMonth(), dim);
  let ws = addDays(fromKey(selectedDate), -3);
  if (ws < first) ws = first;
  if (addDays(ws, 6) > last) ws = addDays(last, -6);
  if (ws < first) ws = first;
  return ws;
}
