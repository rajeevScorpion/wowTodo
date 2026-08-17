import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isExpoGo } from '../../lib/expoGoDetect';

export async function setupNotifications(): Promise<boolean> {
    // expo-notifications is not fully supported in Expo Go
    if (isExpoGo()) {
        console.log('Skipping notification setup — not supported in Expo Go. Use a development build for full reminder support.');
        return false;
    }

    // Configure how notifications are displayed when app is in foreground
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
            ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
            },
        });
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
    }

    // Set up Android notification channels
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Task Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4F46E5',
        });

        await Notifications.setNotificationChannelAsync('alarm-channel', {
            name: 'Task Alarms',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrationPattern: [0, 500, 500, 500, 500, 500],
            lightColor: '#EF4444',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
        });
    }

    return true;
}
