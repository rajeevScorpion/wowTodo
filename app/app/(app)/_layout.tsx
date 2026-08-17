import { Stack } from 'expo-router';
import { AppLayout } from '../../src/components/ui/AppLayout';

export default function AppLayoutWrapper() {
    return (
        <AppLayout>
            <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="tasks" options={{ headerShown: false }} />
                <Stack.Screen name="review" options={{ headerShown: false }} />
                <Stack.Screen name="branch" options={{ headerShown: false }} />
                <Stack.Screen name="task/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="profile-view" options={{ headerShown: false }} />
                <Stack.Screen name="shared" options={{ headerShown: false }} />
                <Stack.Screen name="analytics" options={{ headerShown: false }} />
                <Stack.Screen name="people" options={{ headerShown: false }} />
                <Stack.Screen name="people-detail" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
            </Stack>
        </AppLayout>
    );
}
