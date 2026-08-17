import { useState, useCallback } from 'react';
import {
    FlatList,
    ActivityIndicator,
    Share as RNShare,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
} from 'react-native';
import { YStack, XStack, View } from 'tamagui';
import { useRouter } from 'expo-router';
import { Share2, Inbox, Eye, CheckCircle2, Circle } from 'lucide-react-native';
import { Screen } from '../../src/components/ui/Screen';
import { Tabs } from '../../src/components/ui/Tabs';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { SharedTaskCard } from '../../src/components/sharing/SharedTaskCard';
import { ShareRow } from '../../src/components/sharing/ShareRow';
import { RejectionNoteSheet } from '../../src/components/sharing/RejectionNoteSheet';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { useAuth } from '../../src/providers/AuthProvider';
import {
    useReceivedShares,
    useSentShares,
    useRespondToShare,
    useRevokeShare,
    usePeekTaskTodos,
    EnrichedShare,
    PeekTodo,
} from '../../src/features/sharing/api';

const TABS = [
    { value: 'for_me', label: 'For Me' },
    { value: 'shared', label: 'Shared' },
];

export default function SharedScreen() {
    const { user } = useAuth();
    const colors = useSemanticColors();
    const router = useRouter();
    const [tab, setTab] = useState('for_me');
    const [rejectingShare, setRejectingShare] = useState<EnrichedShare | null>(null);
    const [peekingShare, setPeekingShare] = useState<EnrichedShare | null>(null);

    const { data: received = [], isLoading: loadingReceived } = useReceivedShares();
    const { data: sent = [], isLoading: loadingSent } = useSentShares();
    const respondToShare = useRespondToShare();
    const revokeShare = useRevokeShare();

    const pendingShares = received.filter((s) => s.status === 'pending');
    const acceptedShares = received.filter((s) => s.status === 'accepted');

    const handleAccept = useCallback(
        async (share: EnrichedShare) => {
            try {
                await respondToShare.mutateAsync({
                    shareId: share.id,
                    status: 'accepted',
                });
            } catch (error: any) {
                Alert.alert('Error', error?.message || 'Failed to accept share.');
            }
        },
        [respondToShare]
    );

    const handleReject = useCallback(
        async (note: string) => {
            if (!rejectingShare) return;
            try {
                await respondToShare.mutateAsync({
                    shareId: rejectingShare.id,
                    status: 'rejected',
                    rejectionNote: note || undefined,
                });
            } catch (error: any) {
                Alert.alert('Error', error?.message || 'Failed to decline share.');
            } finally {
                setRejectingShare(null);
            }
        },
        [rejectingShare, respondToShare]
    );

    const handleRevoke = useCallback(
        (shareId: string, taskId: string) => {
            Alert.alert('Revoke Share', 'Remove this person\'s access?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Revoke',
                    style: 'destructive',
                    onPress: () => revokeShare.mutate({ shareId, taskId }),
                },
            ]);
        },
        [revokeShare]
    );

    const handleTaskPress = useCallback(
        (taskId: string) => {
            router.push(`/(app)/task/${taskId}` as any);
        },
        [router]
    );

    const handleInvite = useCallback(async () => {
        try {
            const deepLink = `wowtodo://invite?from=${user?.id || ''}`;
            await RNShare.share({
                message:
                    `Join me on WowTodo! Create smart todo lists with AI.\n\n${deepLink}`,
            });
        } catch {
            // User cancelled
        }
    }, [user]);

    const isLoading = tab === 'for_me' ? loadingReceived : loadingSent;

    return (
        <Screen edges={['left', 'right']}>
            <YStack flex={1} gap="$3">
                <Tabs tabs={TABS} value={tab} onValueChange={setTab} />

                {isLoading ? (
                    <YStack flex={1} alignItems="center" justifyContent="center">
                        <ActivityIndicator size="large" color={colors.primary} />
                    </YStack>
                ) : tab === 'for_me' ? (
                    <ForMeTab
                        pendingShares={pendingShares}
                        acceptedShares={acceptedShares}
                        onAccept={handleAccept}
                        onDecline={setRejectingShare}
                        onPeek={setPeekingShare}
                        onTaskPress={handleTaskPress}
                        isResponding={respondToShare.isPending}
                        onInvite={handleInvite}
                        colors={colors}
                    />
                ) : (
                    <SharedTab
                        sentShares={sent}
                        onRevoke={handleRevoke}
                        isRevoking={revokeShare.isPending}
                        onInvite={handleInvite}
                        colors={colors}
                    />
                )}
            </YStack>

            <RejectionNoteSheet
                visible={!!rejectingShare}
                onClose={() => setRejectingShare(null)}
                onReject={handleReject}
                isLoading={respondToShare.isPending}
            />

            <PeekSheet
                share={peekingShare}
                onClose={() => setPeekingShare(null)}
            />
        </Screen>
    );
}

// ─── Peek Sheet ─────────────────────────────────────────────

function PeekSheet({
    share,
    onClose,
}: {
    share: EnrichedShare | null;
    onClose: () => void;
}) {
    const colors = useSemanticColors();
    const { data: todos = [], isLoading } = usePeekTaskTodos(share?.id || '');

    if (!share) return null;

    return (
        <Modal
            visible={!!share}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={peekStyles.overlay} onPress={onClose}>
                <Pressable
                    style={[peekStyles.sheet, { backgroundColor: colors.neoSurface }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
                        <XStack alignItems="center" gap="$2">
                            <Eye size={18} color={colors.primary} />
                            <AppText weight="semibold" size="md">Preview</AppText>
                        </XStack>
                        <Pressable onPress={onClose} hitSlop={8}>
                            <AppText size="sm" variant="muted">Close</AppText>
                        </Pressable>
                    </XStack>

                    <AppText weight="medium" marginBottom="$1" numberOfLines={2}>
                        {share.task_title}
                    </AppText>
                    {share.task_description && (
                        <AppText size="sm" variant="muted" marginBottom="$3" numberOfLines={3}>
                            {share.task_description}
                        </AppText>
                    )}

                    <AppText size="xs" variant="muted" marginBottom="$2">
                        {todos.length} todo{todos.length !== 1 ? 's' : ''}
                    </AppText>

                    {isLoading ? (
                        <YStack alignItems="center" paddingVertical="$4">
                            <ActivityIndicator size="small" color={colors.primary} />
                        </YStack>
                    ) : (
                        <FlatList
                            data={todos}
                            keyExtractor={(item) => item.id}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item }) => (
                                <XStack alignItems="center" gap="$2" paddingVertical="$1.5">
                                    {item.completed ? (
                                        <CheckCircle2 size={18} color={colors.success} />
                                    ) : (
                                        <Circle size={18} color={colors.muted} />
                                    )}
                                    <AppText
                                        size="sm"
                                        flex={1}
                                        color={item.completed ? colors.muted : colors.color}
                                        style={item.completed ? { textDecorationLine: 'line-through' } : undefined}
                                    >
                                        {item.title}
                                    </AppText>
                                </XStack>
                            )}
                            ListEmptyComponent={
                                <AppText size="sm" variant="muted" textAlign="center" paddingVertical="$4">
                                    No todos yet
                                </AppText>
                            }
                        />
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const peekStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '70%',
    },
});

// ─── For Me Tab ─────────────────────────────────────────────

function ForMeTab({
    pendingShares,
    acceptedShares,
    onAccept,
    onDecline,
    onPeek,
    onTaskPress,
    isResponding,
    onInvite,
    colors,
}: {
    pendingShares: EnrichedShare[];
    acceptedShares: EnrichedShare[];
    onAccept: (share: EnrichedShare) => void;
    onDecline: (share: EnrichedShare) => void;
    onPeek: (share: EnrichedShare) => void;
    onTaskPress: (taskId: string) => void;
    isResponding: boolean;
    onInvite: () => void;
    colors: any;
}) {
    if (pendingShares.length === 0 && acceptedShares.length === 0) {
        return (
            <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
                <Inbox size={48} color={colors.muted} />
                <AppText variant="muted" textAlign="center">
                    No shared tasks yet.{'\n'}When someone shares a task with you, it'll appear here.
                </AppText>
                <Button variant="outline" size="sm" onPress={onInvite}>
                    Invite Someone
                </Button>
            </YStack>
        );
    }

    return (
        <FlatList
            data={[
                ...pendingShares.map((s) => ({ ...s, _section: 'pending' as const })),
                ...acceptedShares.map((s) => ({ ...s, _section: 'accepted' as const })),
            ]}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
                if (item._section === 'pending') {
                    return (
                        <YStack marginBottom="$2">
                            <SharedTaskCard
                                share={item}
                                onPress={() => onPeek(item)}
                                isPending
                            />
                            <XStack gap="$2" paddingHorizontal="$1" marginTop={-8} marginBottom="$2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onPress={() => onPeek(item)}
                                    style={{ flex: 0.5 }}
                                >
                                    <XStack alignItems="center" gap={4}>
                                        <Eye size={14} color={colors.muted} />
                                        <AppText size="xs" variant="muted">Peek</AppText>
                                    </XStack>
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onPress={() => onAccept(item)}
                                    loading={isResponding}
                                    style={{ flex: 1 }}
                                >
                                    Accept
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onPress={() => onDecline(item)}
                                    style={{ flex: 1 }}
                                >
                                    Decline
                                </Button>
                            </XStack>
                        </YStack>
                    );
                }
                return (
                    <SharedTaskCard
                        share={item}
                        onPress={onTaskPress}
                    />
                );
            }}
            ListHeaderComponent={
                pendingShares.length > 0 ? (
                    <AppText size="xs" variant="muted" marginBottom="$2">
                        {pendingShares.length} pending request{pendingShares.length !== 1 ? 's' : ''}
                    </AppText>
                ) : null
            }
        />
    );
}

// ─── Shared Tab ─────────────────────────────────────────────

function SharedTab({
    sentShares,
    onRevoke,
    isRevoking,
    onInvite,
    colors,
}: {
    sentShares: EnrichedShare[];
    onRevoke: (shareId: string, taskId: string) => void;
    isRevoking: boolean;
    onInvite: () => void;
    colors: any;
}) {
    if (sentShares.length === 0) {
        return (
            <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
                <Share2 size={48} color={colors.muted} />
                <AppText variant="muted" textAlign="center">
                    You haven't shared any tasks yet.{'\n'}Share tasks from the task list.
                </AppText>
                <Button variant="outline" size="sm" onPress={onInvite}>
                    Invite Someone
                </Button>
            </YStack>
        );
    }

    return (
        <FlatList
            data={sentShares}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
                <ShareRow
                    share={item}
                    onRevoke={onRevoke}
                    isRevoking={isRevoking}
                />
            )}
        />
    );
}
