import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { QueryClient } from '@tanstack/react-query';
import { isExpoGo } from '../../lib/expoGoDetect';
import {
    LAST_WINDOW_SYNC_KEY,
    QUERY_CACHE_KEY,
    REMINDER_SETTINGS_KEY_PREFIX,
} from '../../lib/storageKeys';

/**
 * Wipe every trace of the signed-out user from the device (F2).
 *
 * Sign-out used to be `supabase.auth.signOut()` and nothing else, which left
 * three things behind on a shared device:
 *
 *  1. the React Query cache, persisted to AsyncStorage with a 7-day `gcTime` —
 *     the next account to sign in rehydrated the previous user's tasks;
 *  2. every scheduled OS notification — the previous user's reminders kept
 *     firing, showing their private todo titles on the lock screen of someone
 *     else's session;
 *  3. the reminder-window throttle timestamp, which is global rather than
 *     per-user, so the *next* user could be throttled out of scheduling any
 *     reminders for up to 30 minutes.
 *
 * Every step is independently guarded. A failure to clear one thing must not
 * abort the rest — a half-cleared device is the situation this exists to
 * prevent, and sign-out itself must never be blocked by cleanup.
 *
 * @param queryClient the app's client; its in-memory cache is cleared too
 * @param userId the user being signed *out*, or null if it was never known
 */
export async function clearLocalUserData(
    queryClient: QueryClient,
    userId: string | null,
): Promise<void> {
    // 1. OS notifications first — the most privacy-sensitive leak, and the only
    //    one that keeps surfacing content after the app is closed.
    if (!isExpoGo()) {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            console.warn('Sign-out: failed to cancel scheduled notifications:', error);
        }
        try {
            await Notifications.dismissAllNotificationsAsync();
        } catch (error) {
            console.warn('Sign-out: failed to dismiss delivered notifications:', error);
        }
    }

    // 2. In-memory cache, then the persisted copy. Order matters: clearing the
    //    client first means the throttled persister can only ever write an
    //    empty cache back, so there is no window where it re-creates the key.
    try {
        queryClient.clear();
    } catch (error) {
        console.warn('Sign-out: failed to clear query cache:', error);
    }

    // 3. Everything this user left in AsyncStorage. Removed in one call so a
    //    single failure cannot leave an arbitrary subset behind.
    const keys = [QUERY_CACHE_KEY, LAST_WINDOW_SYNC_KEY];
    if (userId) {
        keys.push(`${REMINDER_SETTINGS_KEY_PREFIX}${userId}`);
    }

    try {
        await AsyncStorage.multiRemove(keys);
    } catch (error) {
        console.warn('Sign-out: failed to clear cached storage:', error);
    }
}
