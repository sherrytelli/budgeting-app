# Backend API Integration

This document describes how the frontend talks to the budgeting backend: which
routes are wired into the app, what each one is used for, and the exact code
path a user action takes to reach it.

Everything lives under `src/lib/api/`. The backend base URL comes from the
`EXPO_PUBLIC_BACKEND_URL` environment variable (`.env`), and the authenticated
routes are used through TanStack Query in `src/store.tsx`.

## Configuration & plumbing

| Concern | Where | Details |
| --- | --- | --- |
| Base URL | `src/lib/api/env.ts` | Reads `EXPO_PUBLIC_BACKEND_URL` (e.g. `192.168.18.195:8000/api/v1`). A missing scheme is normalized to `http://`. Never hardcoded. |
| HTTP client | `src/lib/api/client.ts` | Single axios instance. Request interceptor adds `Authorization: Bearer <token>`; response interceptor normalizes FastAPI errors into `ApiError` and ends the session on a non-login `401`. |
| Token storage | `src/lib/api/token.ts` | Bearer token persisted in **expo-secure-store** (native) / `localStorage` (web) under `bt_access_token`. |
| Auth state | `src/lib/auth.tsx` | Hydrates the token on boot, exposes `signIn` / `signOut`, registers the `401` handler. |
| Server state | `src/store.tsx` | TanStack Query owns budgets/categories/expenses. Query key `['budgets', monthKey]`, `staleTime` 30s. Every write invalidates `['budgets']` so the visible month refetches. |
| DTO ⇄ model mapping | `src/lib/api/mappers.ts` | Money `"2500.00"` ⇄ `number`, aware `spent_at` ⇄ `date` + minutes, `reminder_time` ⇄ minutes. |

## Routes wired into the app

These routes are actively called by app features.

| Method | Path | Used for | Code path |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Sign the user in (OAuth2 password flow, form-urlencoded) and obtain the bearer token | `login.tsx` → `auth.signIn()` (`src/lib/auth.tsx`) → `login()` (`src/lib/api/auth.ts`) |
| `GET` | `/budgets?year&month` | Load the budgets for the month currently being viewed | `store.tsx` `useQuery` → `fetchMonthBudgets()` (`src/lib/api/budgets.ts`) |
| `GET` | `/budgets/{budget_id}` | Load one budget's nested categories (needed to render the category panel) | `fetchMonthBudgets()` (one call per budget) |
| `GET` | `/expenses?budget_id&month&year&limit=1000` | Load the month's expenses so day totals and the budget progress bar can be computed | `fetchMonthBudgets()` (one call per budget) |
| `POST` | `/budgets` | Create a monthly budget | "Create monthly budget" screen → `app.addBudget()` → `createBudget()` |
| `PUT` | `/budgets/{budget_id}` | Edit a monthly budget (name, limit, currency, month) | "Edit monthly budget" screen → `app.updateBudget()` → `updateBudget()` |
| `DELETE` | `/budgets/{budget_id}` | Delete a budget (cascades to its categories/expenses) | Budget card trash button → `app.deleteBudget()` → `deleteBudget()` |
| `POST` | `/budgets/{budget_id}/categories` | Create a daily category inside a budget | "Create category" sheet → `app.addCategory()` → `createCategory()` |
| `PUT` | `/categories/{category_id}` | Edit a daily category (name, limit, reminder, icon) | "Edit category" sheet → `app.updateCategory()` → `updateCategory()` |
| `DELETE` | `/categories/{category_id}` | Delete a category (cascades to its expenses) | Category sheet / panel → `app.deleteCategory()` → `deleteCategory()` |
| `POST` | `/expenses` | Log a new expense in a category | "Log expense" sheet → `app.addExpense()` → `createExpense()` |
| `PUT` | `/expenses/{expense_id}` | Edit an expense, including moving it to another category | "Edit expense" sheet → `app.updateExpense()` → `updateExpense()` |
| `DELETE` | `/expenses/{expense_id}` | Delete an expense | Expense row trash button → `app.deleteExpense()` → `deleteExpense()` |

## How the month view is loaded

The main screen never requests "everything". It requests the month it is
currently showing, and the store composes three routes into the shape the
existing UI already expects:

```
view.monthKey ("2026-10")
      │
      ▼
GET /budgets?year=2026&month=10            → the month's budgets
      │
      ├─ per budget: GET /budgets/{id}      → categories
      └─ per budget: GET /expenses?budget_id={id}&year=2026&month=10&limit=1000
                                             → expenses, attached to their category
      ▼
Budget[]  (categories each carrying their month expenses)
```

`fetchMonthBudgets()` runs the detail and expense calls in parallel
(`Promise.all`), so a month with **N** budgets costs **1 + 2N** requests.

Because the whole month's expenses are loaded and attached to categories, the
app's existing derived helpers keep working unchanged:

- the budget card's spent total (`budgetSpent`) sums the month's expenses;
- the category panel (`daySpent`) filters those expenses by the selected day — so
  switching days is instant and needs no extra request.

Query lifecycle:

- The query key is `['budgets', <monthKey>]`, so each month is cached
  separately.
- `hydrated` waits for the first month's fetch before the splash screen is
  hidden.
- After any create/update/delete, `['budgets']` is invalidated and the visible
  month refetches. When a budget is created, the store also fetches its target
  month so the carousel can focus the new budget once it appears.

## Authentication flow

1. Boot: `AuthProvider` reads the token from secure storage. If present, the app
   goes straight to the main screen; otherwise the login screen is shown.
2. Sign-in: the login screen calls `POST /auth/login` with
   `application/x-www-form-urlencoded` (`username` = email, `password`). The
   returned `access_token` is written to secure storage and held in auth state.
3. Every subsequent request: the axios interceptor adds
   `Authorization: Bearer <token>`.
4. Expiry: a `401` from any route except `/auth/login` clears the token, which
   sends the user back to the login screen. A `401` from `/auth/login` is treated
   as bad credentials and simply shows the inline error.

## Data mapping notes

- **Money** is stored by the API as decimal strings (`"80000.00"`) and converted
  to/from numbers at the edge. Requests send `toFixed(2)` strings.
- **Expense time**: the app holds a wall-clock `date` (`YYYY-MM-DD`) and minutes
  since midnight. Writes send an aware ISO timestamp with the device's UTC offset
  (the API rejects naive timestamps); reads convert the returned instant back to
  device-local date + minutes.
- **Reminders** (`HH:MM:SS` on the API) map to minutes since midnight in the UI.
- **Icon** is nullable on the API; the UI falls back to `basket`.

## Routes implemented but not yet wired to the UI

These are available as typed functions in `src/lib/api/` and follow the spec, but
the current UI has no feature that calls them (no dead UI was invented to use
them):

| Method | Path | Function | Why unused |
| --- | --- | --- | --- |
| `GET` | `/auth/me` | `getMe()` | The profile is not displayed anywhere. |
| `GET` | `/budgets/current` | `getCurrentBudgets()` | The month view uses `/budgets?year&month` uniformly for all months. |
| `GET` | `/budgets/{budget_id}/daily` | `getBudgetDaily()` | Day panels are derived from the already-loaded month expenses. |
| `GET` | `/budgets/{budget_id}/categories` | `listCategories()` | Categories arrive nested in `GET /budgets/{id}`. |
| `GET` | `/reminders` | `getReminders()` | The app has no push-notification scheduling yet. |
| `GET` | `/expenses/{expense_id}` | `getExpense()` | Expenses come from the month list. |
| `GET` | `/health` | `getHealth()` | Infrastructure probe, not an app feature. |

## Not integrated

- `POST /auth/register` — intentionally left out; there is no sign-up screen.
