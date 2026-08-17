import { useState, useCallback, useRef } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    TextInput,
    FlatList,
    ActivityIndicator,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { YStack, XStack, View } from 'tamagui';
import { X, Search, UserPlus, Share as ShareIcon } from 'lucide-react-native';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { UserAvatar } from './UserAvatar';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { useSemanticColors } from '../../design-system/useSemanticColors';
import { Task, UserSearchResult } from '../../types';
import {
    useSearchUsers,
    useCreateShare,
    useSharesForTask,
    useRevokeShare,
} from '../../features/sharing/api';

interface ShareTaskSheetProps {
    visible: boolean;
    onClose: () => void;
    task: Task;
    hasBranches?: boolean;
}

export function ShareTaskSheet({
    visible,
    onClose,
    task,
    hasBranches = false,
}: ShareTaskSheetProps) {
    const colors = useSemanticColors();
    const [searchQuery, setSearchQuery] = useState('');
    const [includeBranches, setIncludeBranches] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchUsers = useSearchUsers();
    const createShare = useCreateShare();
    const revokeShare = useRevokeShare();
    const { data: existingShares = [], isLoading: loadingShares } = useSharesForTask(
        visible ? task.id : ''
    );

    const handleSearchChange = useCallback(
        (text: string) => {
            setSearchQuery(text);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (text.trim().length >= 2) {
                debounceRef.current = setTimeout(() => {
                    searchUsers.mutate(text);
                }, 300);
            }
        },
        [searchUsers]
    );

    const handleShare = async (recipientId: string) => {
        try {
            await createShare.mutateAsync({
                taskId: task.id,
                recipientId,
                includeBranches,
            });
            setSearchQuery('');
            searchUsers.reset();
        } catch (error: any) {
            if (error?.code === '23505') {
                Alert.alert('Already Shared', 'This task is already shared with this person.');
            } else {
                Alert.alert('Error', 'Failed to share task. Please try again.');
            }
        }
    };

    const handleRevoke = (shareId: string) => {
        Alert.alert('Revoke Share', 'Remove this person\'s access?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Revoke',
                style: 'destructive',
                onPress: () => revokeShare.mutate({ shareId, taskId: task.id }),
            },
        ]);
    };

    const handleClose = () => {
        setSearchQuery('');
        searchUsers.reset();
        setIncludeBranches(false);
        onClose();
    };

    // Filter out users who already have an active share
    const existingRecipientIds = new Set(existingShares.map((s) => s.recipient_id));
    const searchResults = (searchUsers.data || []).filter(
        (u) => !existingRecipientIds.has(u.user_id)
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Pressable
                    style={[styles.sheet, { backgroundColor: colors.neoSurface, borderColor: colors.hairline, borderWidth: 1 }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
                        <XStack alignItems="center" gap={8}>
                            <ShareIcon size={18} color={colors.primary} />
                            <AppText weight="semibold" size="md">Share Task</AppText>
                        </XStack>
                        <Pressable onPress={handleClose} hitSlop={8}>
                            <X size={20} color={colors.muted} />
                        </Pressable>
                    </XStack>

                    <AppText size="sm" variant="muted" numberOfLines={1} marginBottom="$3">
                        {task.title}
                    </AppText>

                    {/* Search input */}
                    <XStack
                        alignItems="center"
                        gap="$2"
                        backgroundColor={colors.neoInset}
                        borderRadius="$3"
                        paddingHorizontal="$3"
                        marginBottom="$3"
                    >
                        <Search size={16} color={colors.muted} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={handleSearchChange}
                            placeholder="Search by name or email..."
                            placeholderTextColor={colors.muted}
                            style={[styles.searchInput, { color: colors.color }]}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchUsers.isPending && (
                            <ActivityIndicator size="small" color={colors.primary} />
                        )}
                    </XStack>

                    {/* Include branches toggle */}
                    {hasBranches && (
                        <XStack
                            alignItems="center"
                            justifyContent="space-between"
                            paddingVertical="$2"
                            marginBottom="$2"
                        >
                            <AppText size="sm">Include branches</AppText>
                            <Switch
                                value={includeBranches}
                                onValueChange={setIncludeBranches}
                                trackColor={{ false: colors.neoInset, true: colors.primary }}
                            />
                        </XStack>
                    )}

                    {/* Search results */}
                    {searchResults.length > 0 && (
                        <YStack marginBottom="$3">
                            <AppText size="xs" variant="muted" marginBottom="$2">
                                Search Results
                            </AppText>
                            {searchResults.map((user) => (
                                <SearchResultRow
                                    key={user.user_id}
                                    user={user}
                                    onShare={() => handleShare(user.user_id)}
                                    isSharing={createShare.isPending}
                                />
                            ))}
                        </YStack>
                    )}

                    {searchQuery.length >= 2 &&
                        !searchUsers.isPending &&
                        searchResults.length === 0 &&
                        (searchUsers.data || []).length === 0 && (
                            <YStack alignItems="center" paddingVertical="$3" marginBottom="$3">
                                <AppText size="sm" variant="muted">
                                    No users found
                                </AppText>
                            </YStack>
                        )}

                    {/* Existing shares */}
                    {existingShares.length > 0 && (
                        <YStack>
                            <AppText size="xs" variant="muted" marginBottom="$2">
                                Shared With
                            </AppText>
                            {existingShares.map((share) => (
                                <XStack
                                    key={share.id}
                                    alignItems="center"
                                    gap="$3"
                                    paddingVertical="$2"
                                >
                                    <UserAvatar
                                        avatarUrl={share.counterpart_avatar}
                                        fullName={share.counterpart_name}
                                        size={32}
                                    />
                                    <YStack flex={1}>
                                        <AppText size="sm" weight="medium">
                                            {share.counterpart_name || 'Unknown'}
                                        </AppText>
                                        <AppText size="xs" variant="muted">
                                            {share.status === 'pending' ? 'Pending' : 'Accepted'}
                                        </AppText>
                                    </YStack>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onPress={() => handleRevoke(share.id)}
                                        disabled={revokeShare.isPending}
                                    >
                                        Revoke
                                    </Button>
                                </XStack>
                            ))}
                        </YStack>
                    )}

                    {loadingShares && (
                        <YStack alignItems="center" paddingVertical="$3">
                            <ActivityIndicator size="small" color={colors.primary} />
                        </YStack>
                    )}
                </Pressable>
            </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Search result row ──────────────────────────────────────

function SearchResultRow({
    user,
    onShare,
    isSharing,
}: {
    user: UserSearchResult;
    onShare: () => void;
    isSharing: boolean;
}) {
    const colors = useSemanticColors();

    return (
        <XStack alignItems="center" gap="$3" paddingVertical="$2">
            <UserAvatar
                avatarUrl={user.avatar_url}
                fullName={user.full_name}
                size={36}
            />
            <YStack flex={1}>
                <AppText size="sm" weight="medium">
                    {user.full_name || 'No name'}
                </AppText>
                {/*
                  * Email is only returned for an exact-email lookup (migration 0013 /
                  * finding F5) — name searches deliberately withhold it so the user
                  * base cannot be harvested. Render the row without it in that case
                  * rather than showing an empty line.
                  */}
                {user.email ? (
                    <AppText size="xs" variant="muted">
                        {user.email}
                    </AppText>
                ) : null}
            </YStack>
            <AnimatedPressable onPress={onShare} scaleDown={0.9}>
                <XStack
                    alignItems="center"
                    gap={4}
                    paddingHorizontal="$3"
                    paddingVertical="$1.5"
                    borderRadius="$3"
                    backgroundColor={colors.primary}
                    opacity={isSharing ? 0.5 : 1}
                >
                    <UserPlus size={14} color="#FFFFFF" />
                    <AppText size="xs" weight="medium" color="#FFFFFF">
                        Share
                    </AppText>
                </XStack>
            </AnimatedPressable>
        </XStack>
    );
}

const styles = StyleSheet.create({
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
        maxHeight: '80%',
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 14,
    },
});
