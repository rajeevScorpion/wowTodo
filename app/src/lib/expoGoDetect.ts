import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Returns true when running inside Expo Go.
 * Used to guard features that require a development build (e.g. expo-notifications).
 */
export function isExpoGo(): boolean {
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
