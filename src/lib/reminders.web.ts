/**
 * Web build of the daily reminders module. `expo-notifications` cannot schedule
 * notifications on web, so this is a no-op. Metro/Expo resolves this file for
 * web, which also keeps `expo-notifications` out of the web bundle entirely.
 */

/** No-op on web. See `reminders.ts` for the native implementation. */
export function useDailyReminderScheduling(): void {}
