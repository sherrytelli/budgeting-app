/**
 * Daily category reminders, delivered as local notifications.
 *
 * A category may carry a reminder time (minutes since midnight). For the
 * budgets of the *current* month, each category with a reminder is scheduled
 * to fire once today at that time, with the text
 * "Reminder, enter your <category> expenses for today".
 *
 * Every reminder is scheduled under a deterministic identifier
 * (`daily-reminder:<categoryId>:<YYYY-MM-DD>`), so a reminder that has already
 * been scheduled for today is never scheduled twice — even across restarts,
 * because the OS keeps the list of scheduled notifications.
 *
 * This is the native implementation. `reminders.web.ts` is a no-op, because
 * `expo-notifications` cannot schedule on web.
 */

import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { fetchMonthBudgets } from '@/lib/api/budgets';
import { splitMonthKey } from '@/lib/api/mappers';
import { useAuth } from '@/lib/auth';
import { keyOf, monthKeyOf, today } from '@/lib/dates';
import { budgetKeys } from '@/store';
import type { Category } from '@/lib/types';

/** Android channel the reminders are delivered on. */
export const REMINDER_CHANNEL_ID = 'daily-reminders';

/** Prefix shared by every identifier this module schedules. */
const ID_PREFIX = 'daily-reminder:';

/** Marks that we've already sent the user to the exact-alarm settings screen. */
const EXACT_ALARM_PROMPTED_KEY = 'bt_exact_alarm_prompted';

// Without a foreground handler the OS drops notifications that arrive while the
// app is open. Set once, at module load.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Deterministic identifier for a category's reminder on a given day. */
export const reminderId = (categoryId: string, dateKey: string) => `${ID_PREFIX}${categoryId}:${dateKey}`;

/** The moment a reminder fires on `dateKey` (device-local time). */
export function reminderDate(reminder: number, dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(reminder / 60), reminder % 60, 0, 0);
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * `SCHEDULE_EXACT_ALARM` lets reminders fire at the exact time instead of being
 * deferred by Android. On Android 12 it's granted automatically, but on Android
 * 13+ devices — for apps targeting API 33+, which this is — it's denied by
 * default and the user must enable it under "Alarms & reminders". There's no
 * Expo API to read or request it, so we open that settings screen once (never
 * nagging again) before scheduling; if the user enables it, we then schedule
 * exactly.
 */
async function requestExactAlarmAccess(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  try {
    if (await SecureStore.getItemAsync(EXACT_ALARM_PROMPTED_KEY)) return;
    const pkg = Application.applicationId;
    if (!pkg) return;
    await SecureStore.setItemAsync(EXACT_ALARM_PROMPTED_KEY, '1');
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, {
      data: `package:${pkg}`,
    });
  } catch {
    // The settings screen isn't available on this device/OS build — reminders
    // still work, just with Android's default (inexact) timing.
  }
}

// Serialize syncs: two overlapping runs could both see a reminder as unscheduled
// and schedule it twice.
let syncInFlight: Promise<void> = Promise.resolve();

/**
 * Schedules today's reminders for `categories`, skipping any that are already
 * scheduled for today, and clears today's reminders that no longer apply.
 */
export function syncDailyReminders(categories: Category[]): Promise<void> {
  syncInFlight = syncInFlight.then(() => runSync(categories)).catch(() => {});
  return syncInFlight;
}

async function runSync(categories: Category[]): Promise<void> {
  const dateKey = keyOf(today());
  const now = Date.now();

  const desired = categories
    .filter((c) => c.reminder != null)
    .map((c) => ({
      categoryId: c.id,
      name: c.name,
      id: reminderId(c.id, dateKey),
      at: reminderDate(c.reminder as number, dateKey),
    }))
    .filter((d) => d.at.getTime() > now); // a time already past today can't be scheduled

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledById = new Map(scheduled.map((r) => [r.identifier, r]));

  // Drop today's reminders that no longer belong to a current-month category
  // (category removed, or its month changed away from the current one).
  const keep = new Set(desired.map((d) => d.id));
  for (const request of scheduled) {
    const isTodayReminder = request.identifier.startsWith(ID_PREFIX) && request.identifier.endsWith(`:${dateKey}`);
    if (isTodayReminder && !keep.has(request.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }

  if (desired.length === 0) return;
  if (!(await ensurePermission())) return;
  await requestExactAlarmAccess();

  for (const d of desired) {
    const existing = scheduledById.get(d.id);
    if (existing) {
      const previous = existing.content.data?.time;
      if (typeof previous === 'number' && previous === d.at.getTime()) continue; // already scheduled for today
      await Notifications.cancelScheduledNotificationAsync(d.id); // time changed → replace
    }
    await Notifications.scheduleNotificationAsync({
      identifier: d.id,
      content: {
        title: 'Budget Tracker',
        body: `Reminder, enter your ${d.name} expenses for today`,
        data: { categoryId: d.categoryId, date: dateKey, time: d.at.getTime() },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: d.at,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }
}

/**
 * Keeps today's reminders in sync with the categories of the budgets in the
 * current month. Mount once, inside the authenticated app.
 */
export function useDailyReminderScheduling(): void {
  const { ready, token } = useAuth();
  const monthKey = monthKeyOf(today());
  const { year, month } = splitMonthKey(monthKey);

  const { data } = useQuery({
    queryKey: budgetKeys.month(monthKey),
    queryFn: () => fetchMonthBudgets(year, month),
    enabled: ready && !!token,
    staleTime: 30_000,
  });

  const categories = useMemo(() => (data ?? []).flatMap((b) => b.categories), [data]);

  useEffect(() => {
    if (!ready || !token) return;
    void syncDailyReminders(categories);
  }, [ready, token, categories]);
}
