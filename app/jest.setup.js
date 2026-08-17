// The Supabase client is constructed at module load and throws without a URL.
// Give it harmless local values so importing app modules works under Jest.
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// Reminder scheduling is pure logic, but the module graph pulls in native
// modules. Stub the ones that have no meaning under Jest.
jest.mock('expo-notifications', () => ({
    scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
    setNotificationChannelAsync: jest.fn(async () => undefined),
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    SchedulableTriggerInputTypes: { DATE: 'date' },
    AndroidImportance: { HIGH: 4, MAX: 5 },
    AndroidNotificationPriority: { HIGH: 'high', MAX: 'max' },
    AndroidNotificationVisibility: { PUBLIC: 1 },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
