import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReminderSettings } from '../../types';

const CACHE_KEY_PREFIX = '@reminder_settings_';

export async function cacheReminderSettings(
    userId: string,
    settings: ReminderSettings[],
): Promise<void> {
    try {
        await AsyncStorage.setItem(
            `${CACHE_KEY_PREFIX}${userId}`,
            JSON.stringify(settings),
        );
    } catch (error) {
        console.warn('Failed to cache reminder settings:', error);
    }
}

export async function getCachedReminderSettings(
    userId: string,
): Promise<ReminderSettings[] | null> {
    try {
        const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
        if (cached) {
            return JSON.parse(cached) as ReminderSettings[];
        }
        return null;
    } catch (error) {
        console.warn('Failed to read cached reminder settings:', error);
        return null;
    }
}

export async function clearReminderSettingsCache(userId: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
    } catch (error) {
        console.warn('Failed to clear reminder settings cache:', error);
    }
}
