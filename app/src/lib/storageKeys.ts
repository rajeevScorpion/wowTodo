/**
 * AsyncStorage keys that hold **per-user** state.
 *
 * These live in one place because sign-out has to clear every one of them
 * (F2). When a key was defined next to the code that wrote it, the sign-out
 * path silently missed it — that is exactly how the previous user's cached
 * tasks survived onto the next account.
 *
 * Adding a key here is not optional bookkeeping: if it holds anything derived
 * from a signed-in user, it must be listed and cleared in
 * `services/session/clearLocalUserData.ts`.
 */

/** Persisted React Query cache (see `PersistQueryClientProvider` in app/_layout.tsx). */
export const QUERY_CACHE_KEY = 'wowtodo-query-cache';

/**
 * Timestamp of the last reminder-window top-up.
 *
 * Deliberately global rather than per-user, but that means it must be cleared
 * on sign-out: the sync is throttled to 30 minutes, so a second account
 * signing in on the same device inside that window would otherwise have
 * `syncReminderWindow` return 0 immediately and schedule no reminders at all.
 */
export const LAST_WINDOW_SYNC_KEY = 'wowtodo:reminders:lastWindowSync';

/** Per-user reminder settings cache. Suffixed with the user id. */
export const REMINDER_SETTINGS_KEY_PREFIX = '@reminder_settings_';
