import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { QueryClient } from '@tanstack/react-query';
import { clearLocalUserData } from '../clearLocalUserData';
import {
    LAST_WINDOW_SYNC_KEY,
    QUERY_CACHE_KEY,
    REMINDER_SETTINGS_KEY_PREFIX,
} from '../../../lib/storageKeys';

jest.mock('../../../lib/expoGoDetect', () => ({ isExpoGo: () => false }));

const USER = 'user-being-signed-out';

function seedDevice() {
    return Promise.all([
        AsyncStorage.setItem(QUERY_CACHE_KEY, JSON.stringify({ clientState: 'user A tasks' })),
        AsyncStorage.setItem(LAST_WINDOW_SYNC_KEY, String(Date.now())),
        AsyncStorage.setItem(`${REMINDER_SETTINGS_KEY_PREFIX}${USER}`, '[{"slot":1}]'),
    ]);
}

describe('clearLocalUserData (F2 — sign-out must not leak to the next account)', () => {
    let queryClient: QueryClient;

    beforeEach(async () => {
        jest.clearAllMocks();
        await AsyncStorage.clear();
        queryClient = new QueryClient();
    });

    // A QueryClient left populated keeps GC timers alive, which stops Jest
    // exiting when an assertion fails partway through.
    afterEach(() => {
        queryClient.clear();
    });

    it('removes the persisted query cache so the next user cannot rehydrate it', async () => {
        await seedDevice();

        await clearLocalUserData(queryClient, USER);

        expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
    });

    it('empties the in-memory query cache', async () => {
        queryClient.setQueryData(['tasks'], [{ id: 't1', title: 'private task' }]);

        await clearLocalUserData(queryClient, USER);

        expect(queryClient.getQueryData(['tasks'])).toBeUndefined();
    });

    it("cancels the signed-out user's scheduled notifications", async () => {
        await clearLocalUserData(queryClient, USER);

        expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
        expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalledTimes(1);
    });

    it('clears the reminder settings cache for that user', async () => {
        await seedDevice();

        await clearLocalUserData(queryClient, USER);

        expect(await AsyncStorage.getItem(`${REMINDER_SETTINGS_KEY_PREFIX}${USER}`)).toBeNull();
    });

    // Regression: the throttle key is global, so leaving it behind would make
    // syncReminderWindow return 0 for the *next* user for up to 30 minutes,
    // silently scheduling them no reminders at all.
    it('clears the global reminder-window throttle so the next user is not throttled', async () => {
        await seedDevice();

        await clearLocalUserData(queryClient, USER);

        expect(await AsyncStorage.getItem(LAST_WINDOW_SYNC_KEY)).toBeNull();
    });

    it('still clears storage when notification cancellation fails', async () => {
        await seedDevice();
        (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock)
            .mockRejectedValueOnce(new Error('no permission'));

        await expect(clearLocalUserData(queryClient, USER)).resolves.toBeUndefined();

        expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
        expect(await AsyncStorage.getItem(LAST_WINDOW_SYNC_KEY)).toBeNull();
    });

    it('clears shared state even when the user id was never known', async () => {
        await seedDevice();

        await clearLocalUserData(queryClient, null);

        expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
        expect(await AsyncStorage.getItem(LAST_WINDOW_SYNC_KEY)).toBeNull();
        // Without an id the per-user key cannot be addressed; it is left alone
        // rather than guessed at.
        expect(await AsyncStorage.getItem(`${REMINDER_SETTINGS_KEY_PREFIX}${USER}`)).not.toBeNull();
    });
});
