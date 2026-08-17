import { useState, useMemo, useCallback } from 'react';
import { FlatList, ActivityIndicator, ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { YStack, XStack, Input as TamaguiInput } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TaskCard } from '../../src/components/TaskCard';
import { Tabs } from '../../src/components/ui/Tabs';
import { useTasks, useDeleteTask } from '../../src/features/tasks/api';
import { useGroups } from '../../src/features/groups/api';
import { useSentShares } from '../../src/features/sharing/api';
import { SharedUser } from '../../src/components/TaskCard';
import { AppText } from '../../src/components/ui/AppText';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { TaskBranchesSheet } from '../../src/components/TaskBranchesSheet';
import { ShareTaskSheet } from '../../src/components/sharing/ShareTaskSheet';
import { Sparkles, Search } from 'lucide-react-native';

const STATUS_TABS = [
    { value: 'all', label: 'All' },
    { value: 'incomplete', label: 'In Progress' },
    { value: 'complete', label: 'Complete' },
];

export default function TaskListScreen() {
    const { groupId: initialGroupId } = useLocalSearchParams<{ groupId?: string }>();
    const { data: tasks, isLoading, isFetching, error } = useTasks();
    const { data: groups } = useGroups();
    const { data: sentShares } = useSentShares();
    const deleteTask = useDeleteTask();
    const router = useRouter();
    const colors = useSemanticColors();

    const [statusFilter, setStatusFilter] = useState('all');
    const [groupFilter, setGroupFilter] = useState<string | null>(initialGroupId ?? null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialogTaskId, setDeleteDialogTaskId] = useState<string | null>(null);
    const [branchAlertVisible, setBranchAlertVisible] = useState(false);
    const [branchViewTaskId, setBranchViewTaskId] = useState<string | null>(null);
    const [shareTaskId, setShareTaskId] = useState<string | null>(null);

    const groupNameMap = useMemo(() => {
        const map = new Map<string, string>();
        groups?.forEach(g => map.set(g.id, g.name));
        return map;
    }, [groups]);

    const sharesMap = useMemo(() => {
        const map = new Map<string, SharedUser[]>();
        if (!sentShares) return map;
        for (const share of sentShares) {
            if (share.status !== 'pending' && share.status !== 'accepted') continue;
            const existing = map.get(share.task_id) || [];
            existing.push({ name: share.counterpart_name, avatar: share.counterpart_avatar });
            map.set(share.task_id, existing);
        }
        return map;
    }, [sentShares]);

    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        let result = tasks;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(query) ||
                (t.description && t.description.toLowerCase().includes(query))
            );
        }

        // Status filter
        if (statusFilter === 'complete') {
            result = result.filter(t => t.total_count > 0 && t.completed_count === t.total_count);
        } else if (statusFilter === 'incomplete') {
            result = result.filter(t => t.total_count === 0 || t.completed_count < t.total_count);
        }

        // Group filter
        if (groupFilter !== null) {
            result = result.filter(t => t.group_id === groupFilter);
        }

        return result;
    }, [tasks, searchQuery, statusFilter, groupFilter]);

    const handleTaskPress = useCallback((taskId: string) => {
        router.push(`/(app)/task/${taskId}`);
    }, [router]);

    const taskToDelete = tasks?.find(t => t.id === deleteDialogTaskId);

    const handleDeleteTask = useCallback((taskId: string) => {
        // Check if any todos in this task are branched
        const task = tasks?.find(t => t.id === taskId);
        const hasBranches = task?.todos?.some(t => t.is_branched) ?? false;
        if (hasBranches) {
            setBranchAlertVisible(true);
            return;
        }
        setDeleteDialogTaskId(taskId);
    }, [tasks]);

    const renderTaskItem = useCallback(({ item }: { item: typeof filteredTasks[number] }) => (
        <TaskCard
            task={item}
            groupName={item.group_id ? groupNameMap.get(item.group_id) : undefined}
            sharedWith={sharesMap.get(item.id)}
            onPress={handleTaskPress}
            onDelete={handleDeleteTask}
            onViewBranches={setBranchViewTaskId}
            onShareTask={setShareTaskId}
            isDeleting={deleteTask.isPending}
        />
    ), [groupNameMap, sharesMap, handleTaskPress, handleDeleteTask, deleteTask.isPending]);

    if (isLoading) {
        return (
            <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor={colors.neoBg}>
                <ActivityIndicator size="large" color={colors.primary} />
            </YStack>
        );
    }

    if (error) {
        return (
            <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor={colors.neoBg}>
                <AppText variant="error">Error loading tasks</AppText>
            </YStack>
        );
    }

    return (
        <View
            style={{ flex: 1, backgroundColor: colors.neoBg }}
        >
            {/* Search bar */}
            <YStack paddingHorizontal={16} paddingTop={16} paddingBottom={8}>
                <View style={{ position: 'relative' }}>
                    <TamaguiInput
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        width="100%"
                        height={44}
                        backgroundColor={colors.neoInset}
                        borderWidth={1}
                        borderColor={colors.hairline}
                        borderRadius={14}
                        paddingHorizontal={12}
                        paddingRight={40}
                        paddingVertical={8}
                        fontSize={16}
                        color={colors.color}
                        placeholderTextColor={colors.muted}
                    />
                    <View style={{ position: 'absolute', right: 12, top: '50%', marginTop: -10 }}>
                        <Search size={20} color={colors.muted} />
                    </View>
                </View>
            </YStack>

            {/* Status filter tabs */}
            <YStack paddingHorizontal={16} paddingBottom={8}>
                <Tabs tabs={STATUS_TABS} value={statusFilter} onValueChange={setStatusFilter} />
            </YStack>

            {/* Group filter chips */}
            {groups && groups.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipScroll}
                    contentContainerStyle={styles.chipRow}
                >
                    <Pressable
                        onPress={() => setGroupFilter(null)}
                        style={[styles.chip, { backgroundColor: groupFilter === null ? colors.neoAccentGold : colors.neoSurface, borderWidth: 1, borderColor: colors.hairline }]}
                    >
                        <AppText
                            size="xs"
                            weight="medium"
                            color={groupFilter === null ? 'white' : colors.secondary}
                        >
                            All Groups
                        </AppText>
                    </Pressable>
                    {groups.map(group => (
                        <Pressable
                            key={group.id}
                            onPress={() => setGroupFilter(groupFilter === group.id ? null : group.id)}
                            style={[styles.chip, { backgroundColor: groupFilter === group.id ? colors.neoAccentGold : colors.neoSurface, borderWidth: 1, borderColor: colors.hairline }]}
                        >
                            <AppText
                                size="xs"
                                weight="medium"
                                color={groupFilter === group.id ? 'white' : colors.secondary}
                            >
                                {group.name}
                            </AppText>
                        </Pressable>
                    ))}
                </ScrollView>
            )}

            {/* Subtle sync indicator — only shown during background refetch, not initial load */}
            {isFetching && !isLoading && (
                <XStack alignItems="center" justifyContent="center" paddingVertical={4} gap={6}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <AppText size="xs" variant="muted">Syncing...</AppText>
                </XStack>
            )}

            <FlatList
                data={filteredTasks}
                style={{ flex: 1 }}
                keyExtractor={(item) => item.id}
                renderItem={renderTaskItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 }}
                ListEmptyComponent={
                    <YStack alignItems="center" justifyContent="center" paddingVertical="$10" gap="$2">
                        <Sparkles size={32} color={colors.muted} />
                        <AppText variant="muted" textAlign="center">
                            No tasks yet.{'\n'}Tap the mic button to create one!
                        </AppText>
                    </YStack>
                }
            />

            <ConfirmDialog
                visible={deleteDialogTaskId !== null}
                title="Delete Task"
                message={`Are you sure you want to delete "${taskToDelete?.title ?? 'this task'}"? This will also delete all its todos.`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => {
                    if (deleteDialogTaskId) {
                        deleteTask.mutate(deleteDialogTaskId, {
                            onSettled: () => setDeleteDialogTaskId(null),
                        });
                    }
                }}
                onCancel={() => setDeleteDialogTaskId(null)}
                isLoading={deleteTask.isPending}
            />

            <ConfirmDialog
                visible={branchAlertVisible}
                title="Cannot Delete"
                message="This task has branched todos. Please unbranch or delete the branches first."
                confirmLabel="OK"
                variant="default"
                showCancel={false}
                onConfirm={() => setBranchAlertVisible(false)}
                onCancel={() => setBranchAlertVisible(false)}
            />

            {shareTaskId && (() => {
                const shareTask = tasks?.find(t => t.id === shareTaskId);
                return shareTask ? (
                    <ShareTaskSheet
                        visible
                        onClose={() => setShareTaskId(null)}
                        task={shareTask}
                        hasBranches={shareTask.todos?.some(t => t.is_branched) ?? false}
                    />
                ) : null;
            })()}

            {branchViewTaskId && (
                <TaskBranchesSheet
                    visible={!!branchViewTaskId}
                    onClose={() => setBranchViewTaskId(null)}
                    taskId={branchViewTaskId}
                    branchedTodos={
                        tasks?.find(t => t.id === branchViewTaskId)?.todos.filter(t => t.is_branched) ?? []
                    }
                    onGoToBranch={(branchTaskId) => {
                        router.push(`/(app)/task/${branchTaskId}`);
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    chipScroll: {
        flexGrow: 0,
    },
    chipRow: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        alignItems: 'center',
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 22,
    },
});
