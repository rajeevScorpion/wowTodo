import { FlatList, ActivityIndicator, Alert } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { Screen } from '../../src/components/ui/Screen';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { NotificationRow } from '../../src/components/sharing/NotificationRow';
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from '../../src/features/sharing/api';
import { InAppNotification } from '../../src/types';
import { supabase } from '../../src/lib/supabase';

export default function NotificationsScreen() {
    const colors = useSemanticColors();
    const router = useRouter();
    const { data: notifications = [], isLoading } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleNotificationPress = async (notification: InAppNotification) => {
        if (!notification.read) {
            markRead.mutate(notification.id);
        }

        // For share_received notifications, navigate to Shared tab (task isn't accessible yet via RLS)
        if (notification.type === 'share_received') {
            router.push('/(app)/shared' as any);
            return;
        }

        // For accepted/rejected notifications, pre-fetch task then navigate
        if (notification.task_id) {
            const { data } = await supabase
                .from('tasks')
                .select('id')
                .eq('id', notification.task_id)
                .maybeSingle();

            if (data) {
                router.push(`/(app)/task/${notification.task_id}` as any);
            } else {
                Alert.alert('Task Unavailable', 'This task may have been deleted or you no longer have access.');
            }
        }
    };

    if (isLoading) {
        return (
            <Screen edges={['left', 'right']}>
                <YStack flex={1} alignItems="center" justifyContent="center">
                    <ActivityIndicator size="large" color={colors.primary} />
                </YStack>
            </Screen>
        );
    }

    return (
        <Screen edges={['left', 'right']} padding="$0">
            <YStack flex={1}>
                <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal="$4"
                    paddingVertical="$3"
                >
                    <Heading level={3}>Notifications</Heading>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => markAllRead.mutate()}
                            loading={markAllRead.isPending}
                        >
                            Mark all read
                        </Button>
                    )}
                </XStack>

                {notifications.length === 0 ? (
                    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
                        <Bell size={48} color={colors.muted} />
                        <AppText variant="muted" textAlign="center">
                            No notifications yet.
                        </AppText>
                    </YStack>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <NotificationRow
                                notification={item}
                                onPress={handleNotificationPress}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 80 }}
                    />
                )}
            </YStack>
        </Screen>
    );
}
