import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { TamaguiProvider, YStack, Spinner } from 'tamagui';
import { AuthProvider, useAuth } from '../src/providers/AuthProvider';
import { useEffect, useState, useRef, createContext, useContext, ReactNode } from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tamaguiConfig from '../src/design-system/tamagui.config';
import { setupNotifications } from '../src/services/reminders/setup';
import * as Notifications from 'expo-notifications';
import { isExpoGo } from '../src/lib/expoGoDetect';
import { ToastProvider } from '../src/contexts/ToastContext';
import { useCreateProfile } from '../src/features/profile/api';
import { supabase } from '../src/lib/supabase';

LogBox.ignoreLogs(["Must call import '@tamagui/native/setup-zeego'"]);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2,     // 2 min — data is "fresh", no refetch on remount
            gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days — match persistence maxAge
            retry: 2,
            refetchOnWindowFocus: false,   // prevent aggressive refetch on app foreground
            refetchOnReconnect: true,      // DO refetch when coming back online
        },
        mutations: {
            retry: 0,                      // let optimistic rollback handle failures
        },
    },
});

const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: 'wowtodo-query-cache',
    throttleTime: 3000, // write to AsyncStorage at most once per 3 seconds
});

const THEME_STORAGE_KEY = '@app_theme';

type Theme = 'light' | 'dark';
type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextType = {
    theme: Theme;
    preference: ThemePreference;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    preference: 'system',
    toggleTheme: () => {},
    setTheme: () => {},
    setPreference: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function InitialLayout() {
    const { session, loading, user } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const createProfile = useCreateProfile();
    const autoCreateAttempted = useRef(false);

    // Silently auto-create profile from metadata if missing (best-effort, non-blocking)
    useEffect(() => {
        if (!session || !user || autoCreateAttempted.current) return;
        autoCreateAttempted.current = true;

        const metadata = user.user_metadata as Record<string, any> | undefined;
        const name = metadata?.full_name || metadata?.name;
        const avatar = metadata?.avatar_url || metadata?.picture || null;
        const dob = metadata?.date_of_birth || null;

        if (name) {
            createProfile.mutateAsync({
                user_id: user.id,
                full_name: name,
                avatar_url: avatar,
                date_of_birth: dob,
            }).catch(() => {}); // silent — profile may already exist from signup
        }
    }, [session, user]);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inCallbackRoute = segments[0] === 'callback';
        const inResetPasswordRoute = segments[0] === 'reset-password';
        const inDevGroup = segments[0] === '(dev)';

        if (!session && !inAuthGroup && !inCallbackRoute && !inResetPasswordRoute && !inDevGroup) {
            router.replace('/(auth)/login');
        } else if (session && (inAuthGroup || inCallbackRoute)) {
            router.replace('/(app)');
        }
    }, [session, loading, segments]);

    // Set up notification channels and permissions when authenticated (skip in Expo Go)
    useEffect(() => {
        if (session && !isExpoGo()) {
            setupNotifications().catch(console.warn);
        }
    }, [session]);

    // Handle notification tap — pre-fetch task then navigate (skip in Expo Go)
    useEffect(() => {
        if (isExpoGo()) return;
        const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
            const data = response.notification.request.content.data;

            // For share_received notifications, navigate to Shared tab
            if (data?.type === 'share_received') {
                router.push('/(app)/shared' as any);
                return;
            }

            if (data?.taskId) {
                const { data: task } = await supabase
                    .from('tasks')
                    .select('id')
                    .eq('id', data.taskId as string)
                    .maybeSingle();

                if (task) {
                    router.push(`/(app)/task/${data.taskId}`);
                }
                // Silently skip navigation if task not found
            }
        });
        return () => subscription.remove();
    }, [router]);

    if (loading) {
        return (
            <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
                <Spinner size="large" color="$primary" />
            </YStack>
        );
    }

    return <Slot />;
}

function ThemeProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [preference, setPreferenceState] = useState<ThemePreference>('system');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                setPreferenceState(saved as ThemePreference);
            }
            setIsLoaded(true);
        }).catch(() => {
            setIsLoaded(true);
        });
    }, []);

    const resolvedTheme: Theme =
        preference === 'system'
            ? (systemColorScheme === 'dark' ? 'dark' : 'light')
            : preference;

    const toggleTheme = () => {
        const newPref: ThemePreference = resolvedTheme === 'light' ? 'dark' : 'light';
        setPreferenceState(newPref);
        AsyncStorage.setItem(THEME_STORAGE_KEY, newPref).catch(() => {});
    };

    const setTheme = (newTheme: Theme) => {
        setPreferenceState(newTheme);
        AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme).catch(() => {});
    };

    const setPreference = (pref: ThemePreference) => {
        setPreferenceState(pref);
        AsyncStorage.setItem(THEME_STORAGE_KEY, pref).catch(() => {});
    };

    return (
        <ThemeContext.Provider value={{ theme: resolvedTheme, preference, toggleTheme, setTheme, setPreference }}>
            <TamaguiProvider config={tamaguiConfig} defaultTheme={resolvedTheme}>
                <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
                {isLoaded ? children : (
                    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
                        <Spinner size="large" color="$primary" />
                    </YStack>
                )}
            </TamaguiProvider>
        </ThemeContext.Provider>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <PersistQueryClientProvider
                    client={queryClient}
                    persistOptions={{
                        persister: asyncStoragePersister,
                        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
                        buster: '2', // increment on schema changes to bust stale cache
                    }}
                >
                    <AuthProvider>
                        <ToastProvider>
                            <InitialLayout />
                        </ToastProvider>
                    </AuthProvider>
                </PersistQueryClientProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
