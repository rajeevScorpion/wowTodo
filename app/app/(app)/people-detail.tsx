import { useMemo, useState } from 'react';
import { FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { Screen } from '../../src/components/ui/Screen';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';
import { Tabs } from '../../src/components/ui/Tabs';
import { NeoPill } from '../../src/components/neo/NeoPill';
import { UserAvatar } from '../../src/components/sharing/UserAvatar';
import { SharedTaskCard } from '../../src/components/sharing/SharedTaskCard';
import { useReceivedShares, useSentShares, EnrichedShare } from '../../src/features/sharing/api';

const TABS = [
    { value: 'their', label: 'Their Tasks' },
    { value: 'your', label: 'Your Tasks' },
];

type FilterValue = 'all' | 'pending' | 'completed';

const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
];

export default function PeopleDetailScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const colors = useSemanticColors();
    const [tab, setTab] = useState('their');
    const [filter, setFilter] = useState<FilterValue>('all');

    const { data: received = [], isLoading: lr } = useReceivedShares();
    const { data: sent = [], isLoading: ls } = useSentShares();

    // Tasks they shared with me (their tasks)
    const theirTasks = useMemo(
        () => received.filter((s) => s.owner_id === userId && s.status === 'accepted'),
        [received, userId]
    );

    // Tasks I shared with them (my tasks)
    const myTasks = useMemo(
        () => sent.filter((s) => s.recipient_id === userId && s.status === 'accepted'),
        [sent, userId]
    );

    const baseTasks = tab === 'their' ? theirTasks : myTasks;

    // Apply filter
    const activeTasks = useMemo(() => {
        if (filter === 'all') return baseTasks;
        if (filter === 'completed') {
            return baseTasks.filter(
                (s) => s.total_count > 0 && s.completed_count === s.total_count
            );
        }
        // pending = in progress (has incomplete todos)
        return baseTasks.filter(
            (s) => s.total_count === 0 || s.completed_count < s.total_count
        );
    }, [baseTasks, filter]);

    // Get collaborator info from any share
    const anyShare = theirTasks[0] || myTasks[0];
    const name = anyShare?.counterpart_name || 'Unknown';
    const avatar = anyShare?.counterpart_avatar || null;

    const totalTodos = baseTasks.reduce((sum, s) => sum + s.total_count, 0);
    const completedTodos = baseTasks.reduce((sum, s) => sum + s.completed_count, 0);

    const handleTaskPress = (taskId: string) => {
        router.push(`/(app)/task/${taskId}` as any);
    };

    if (lr || ls) {
        return (
            <Screen edges={['left', 'right']}>
                <YStack flex={1} alignItems="center" justifyContent="center">
                    <ActivityIndicator size="large" color={colors.primary} />
                </YStack>
            </Screen>
        );
    }

    return (
        <Screen edges={['left', 'right']}>
            <YStack flex={1} gap="$3">
                {/* Profile header */}
                <XStack alignItems="center" gap="$3">
                    <UserAvatar avatarUrl={avatar} fullName={name} size={48} />
                    <YStack flex={1}>
                        <Heading level={3}>{name}</Heading>
                        <AppText size="sm" variant="muted">
                            {baseTasks.length} task{baseTasks.length !== 1 ? 's' : ''}
                            {' \u00B7 '}
                            {completedTodos}/{totalTodos} todos done
                        </AppText>
                    </YStack>
                </XStack>

                <Tabs tabs={TABS} value={tab} onValueChange={setTab} />

                {/* Filter pills */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flexGrow: 0 }}
                    contentContainerStyle={{ gap: 8, alignItems: 'center' }}
                >
                    {FILTERS.map((f) => (
                        <NeoPill
                            key={f.value}
                            active={filter === f.value}
                            onPress={() => setFilter(f.value)}
                            pressStyle={{ opacity: 0.8 }}
                        >
                            <AppText
                                size="xs"
                                weight="medium"
                                color={filter === f.value ? '#FFFFFF' : colors.color}
                            >
                                {f.label}
                            </AppText>
                        </NeoPill>
                    ))}
                </ScrollView>

                {activeTasks.length === 0 ? (
                    <YStack flex={1} alignItems="center" justifyContent="center">
                        <AppText variant="muted" textAlign="center">
                            No {filter !== 'all' ? filter : ''} tasks in this category.
                        </AppText>
                    </YStack>
                ) : (
                    <FlatList
                        data={activeTasks}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <SharedTaskCard
                                share={item}
                                onPress={handleTaskPress}
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
