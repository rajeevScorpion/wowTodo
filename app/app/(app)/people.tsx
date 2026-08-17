import { useMemo } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { YStack } from 'tamagui';
import { Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { Screen } from '../../src/components/ui/Screen';
import { AppText } from '../../src/components/ui/AppText';
import { CollaboratorCard, CollaboratorData } from '../../src/components/sharing/CollaboratorCard';
import { useReceivedShares, useSentShares, EnrichedShare } from '../../src/features/sharing/api';

export default function PeopleScreen() {
    const colors = useSemanticColors();
    const router = useRouter();
    const { data: received = [], isLoading: loadingReceived } = useReceivedShares();
    const { data: sent = [], isLoading: loadingSent } = useSentShares();

    const collaborators = useMemo(() => {
        const map = new Map<string, CollaboratorData>();

        const addShare = (share: EnrichedShare, counterpartId: string) => {
            if (share.status !== 'accepted') return;

            const existing = map.get(counterpartId) || {
                userId: counterpartId,
                fullName: share.counterpart_name,
                avatarUrl: share.counterpart_avatar,
                tasksDue: 0,
                tasksCompleted: 0,
                tasksTotal: 0,
                todosDue: 0,
                todosCompleted: 0,
                todosTotal: 0,
            };

            existing.tasksTotal++;
            const taskComplete =
                share.total_count > 0 && share.completed_count === share.total_count;
            if (taskComplete) {
                existing.tasksCompleted++;
            } else {
                existing.tasksDue++;
            }
            existing.todosTotal += share.total_count;
            existing.todosCompleted += share.completed_count;
            existing.todosDue += share.total_count - share.completed_count;

            // Update name/avatar if we have newer data
            if (share.counterpart_name) existing.fullName = share.counterpart_name;
            if (share.counterpart_avatar) existing.avatarUrl = share.counterpart_avatar;

            map.set(counterpartId, existing);
        };

        // From received shares: counterpart is the owner
        for (const share of received) {
            addShare(share, share.owner_id);
        }

        // From sent shares: counterpart is the recipient
        for (const share of sent) {
            addShare(share, share.recipient_id);
        }

        return Array.from(map.values()).sort((a, b) => b.tasksTotal - a.tasksTotal);
    }, [received, sent]);

    const isLoading = loadingReceived || loadingSent;

    const handleCollaboratorPress = (userId: string) => {
        router.push({ pathname: '/(app)/people-detail' as any, params: { userId } });
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
        <Screen edges={['left', 'right']}>
            <YStack flex={1} gap="$3">
                {collaborators.length === 0 ? (
                    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
                        <Users size={48} color={colors.muted} />
                        <AppText variant="muted" textAlign="center">
                            No collaborators yet.{'\n'}Share tasks with others to see them here.
                        </AppText>
                    </YStack>
                ) : (
                    <FlatList
                        data={collaborators}
                        keyExtractor={(item) => item.userId}
                        renderItem={({ item }) => (
                            <CollaboratorCard
                                collaborator={item}
                                onPress={handleCollaboratorPress}
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
