import { useState, useCallback } from 'react';
import { ActivityIndicator, View, TouchableOpacity, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack } from 'tamagui';
import { useQuery } from '@tanstack/react-query';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { AppText } from '../../../src/components/ui/AppText';
import { TodoItem } from '../../../src/components/TodoItem';
import { ReminderEditSheet } from '../../../src/components/ReminderEditSheet';
import { BranchInfoSheet } from '../../../src/components/BranchInfoSheet';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import { UserAvatar } from '../../../src/components/sharing/UserAvatar';
import {
    useTask,
    useTaskTodos,
    useAddTodo,
    useToggleTodo,
    useDeleteTodo,
    useReorderTodos,
    useUpdateTodo,
    useUnbranch,
} from '../../../src/features/tasks/api';
import { useAuth } from '../../../src/providers/AuthProvider';
import { cancelRemindersForTodo } from '../../../src/services/reminders/scheduler';
import { Plus, Calendar, GitBranch, Layers, Share2 } from 'lucide-react-native';
import { Todo, Task } from '../../../src/types';
import { useGroups } from '../../../src/features/groups/api';
import { useSharesForTask } from '../../../src/features/sharing/api';
import { useSemanticColors } from '../../../src/design-system/useSemanticColors';
import { supabase } from '../../../src/lib/supabase';

function formatEventTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function TaskDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const colors = useSemanticColors();

    const { data: task, isLoading: taskLoading, isFetching: taskFetching } = useTask(id!);
    const { data: todos, isLoading: todosLoading, isFetching: todosFetching } = useTaskTodos(id!);
    const { data: groups } = useGroups();
    const addTodo = useAddTodo();
    const toggleTodo = useToggleTodo();
    const deleteTodo = useDeleteTodo();
    const reorderTodos = useReorderTodos();
    const updateTodo = useUpdateTodo();
    const unbranch = useUnbranch();

    // Fetch shares for this task (only when user is owner)
    const isOwner = !task || task.user_id === user?.id;
    const { data: taskShares } = useSharesForTask(isOwner ? id! : '');
    const isSharedTask = !!task && !isOwner;

    // Fetch sharer profile for shared tasks
    const { data: sharerProfile } = useQuery({
        queryKey: ['shares', 'sharer-profile', id],
        queryFn: async () => {
            const { data: share } = await supabase
                .from('shares')
                .select('owner_id')
                .eq('task_id', id!)
                .eq('recipient_id', user!.id)
                .eq('status', 'accepted')
                .single();

            if (!share) return null;

            const { data: profiles } = await supabase.rpc('get_profiles_by_ids', {
                p_user_ids: [share.owner_id],
            });

            const profile = profiles?.[0];
            return profile ? {
                userId: share.owner_id as string,
                fullName: profile.full_name as string | null,
                avatarUrl: profile.avatar_url as string | null,
            } : null;
        },
        enabled: isSharedTask,
    });

    const [newTodoTitle, setNewTodoTitle] = useState('');
    const [reminderTodo, setReminderTodo] = useState<Todo | null>(null);
    const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [branchInfoTodo, setBranchInfoTodo] = useState<Todo | null>(null);
    const [branchDeleteAlert, setBranchDeleteAlert] = useState(false);
    const [motherTaskError, setMotherTaskError] = useState<string | null>(null);

    const handleAddTodo = () => {
        if (!newTodoTitle.trim() || !user || !id) return;
        const maxOrder = todos?.reduce((max, t) => Math.max(max, t.order), -1) ?? -1;
        addTodo.mutate({
            task_id: id,
            user_id: user.id,
            title: newTodoTitle.trim(),
            completed: false,
            order: maxOrder + 1,
        });
        setNewTodoTitle('');
    };

    const handleToggle = (todoId: string, completed: boolean) => {
        // Find the todo to check if it's branched
        const todo = todos?.find(t => t.id === todoId);
        if (todo?.is_branched) {
            // Blocked: completion is derived from branch items
            return;
        }
        setTogglingIds((prev) => new Set(prev).add(todoId));
        toggleTodo.mutate(
            { id: todoId, completed, taskId: id! },
            {
                onSettled: () => {
                    setTogglingIds((prev) => {
                        const next = new Set(prev);
                        next.delete(todoId);
                        return next;
                    });
                },
            },
        );
        if (completed) {
            cancelRemindersForTodo(todoId).catch(console.warn);
        }
    };

    const handleDelete = (todoId: string, taskId: string) => {
        // Check if the todo is branched - warn before deleting
        const todo = todos?.find(t => t.id === todoId);
        if (todo?.is_branched) {
            setBranchDeleteAlert(true);
            return;
        }
        cancelRemindersForTodo(todoId).catch(console.warn);
        setDeletingIds((prev) => new Set(prev).add(todoId));
        deleteTodo.mutate(
            { id: todoId, taskId },
            {
                onSettled: () => {
                    setDeletingIds((prev) => {
                        const next = new Set(prev);
                        next.delete(todoId);
                        return next;
                    });
                },
            },
        );
    };

    const handleSetReminder = (todo: Todo) => {
        setReminderTodo(todo);
    };

    const handleEdit = (todoId: string) => {
        setEditingTodoId(todoId || null);
    };

    const handleSaveEdit = (todoId: string, newTitle: string) => {
        if (!id) return;
        updateTodo.mutate({ id: todoId, taskId: id, title: newTitle });
        setEditingTodoId(null);
    };

    const handleDragEnd = useCallback(
        ({ data }: { data: Todo[] }) => {
            if (!id) return;
            const orderedIds = data.map((t) => t.id);
            reorderTodos.mutate({ taskId: id, orderedIds });
        },
        [id, reorderTodos],
    );

    // Branch handlers
    const handleBranch = (todoId: string, taskId: string) => {
        router.push(`/(app)/branch?todoId=${todoId}&taskId=${taskId}&lang=en`);
    };

    const handleViewBranch = (todo: Todo) => {
        setBranchInfoTodo(todo);
    };

    const handleUnbranch = (branchTaskId: string, parentTodoId: string) => {
        unbranch.mutate({ branchTaskId, parentTodoId });
    };

    const handleUnbranchFromTodoMenu = (todo: Todo) => {
        // Need to find the branch task for this todo, then unbranch
        // We'll open the branch info sheet which has the unbranch button
        setBranchInfoTodo(todo);
    };

    // Navigate to mother task (for branch tasks)
    const handleGoToMotherTask = useCallback(async () => {
        if (!task?.parent_todo_id) return;
        try {
            // Look up which task owns the parent todo
            const { data: parentTodo, error } = await supabase
                .from('todos')
                .select('task_id')
                .eq('id', task.parent_todo_id)
                .single();

            if (error || !parentTodo) {
                setMotherTaskError('Could not find the parent task.');
                return;
            }
            router.push(`/(app)/task/${parentTodo.task_id}`);
        } catch {
            setMotherTaskError('Could not navigate to parent task.');
        }
    }, [task?.parent_todo_id, router]);

    const renderItem = useCallback(
        ({ item, drag, isActive }: RenderItemParams<Todo>) => {
            // For shared tasks: the recipient can only toggle and add todos.
            // Todos owned by the task owner are read-only (no edit/delete/branch/reminder).
            // Todos the recipient added themselves (todo.user_id === user.id) get full access.
            const todoReadOnly = isSharedTask && item.user_id !== user?.id;

            return (
                <TodoItem
                    todo={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onSaveEdit={handleSaveEdit}
                    isEditing={editingTodoId === item.id}
                    onSetReminder={handleSetReminder}
                    onBranch={handleBranch}
                    onViewBranch={handleViewBranch}
                    onUnbranch={handleUnbranchFromTodoMenu}
                    isToggling={togglingIds.has(item.id)}
                    isDeleting={deletingIds.has(item.id)}
                    drag={todoReadOnly ? undefined : drag}
                    isActive={isActive}
                    readOnly={todoReadOnly}
                />
            );
        },
        [togglingIds, deletingIds, editingTodoId, updateTodo, isSharedTask, user?.id],
    );

    if (taskLoading || todosLoading) {
        return (
            <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor={colors.background}>
                <ActivityIndicator size="large" color={colors.primary} />
            </YStack>
        );
    }

    if (!task) {
        return (
            <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor={colors.background}>
                <AppText variant="error">Task not found</AppText>
            </YStack>
        );
    }

    const completedCount = todos?.filter((t) => t.completed).length ?? 0;
    const totalCount = todos?.length ?? 0;
    const isBranchTask = !!task.parent_todo_id;
    const groupName = task.group_id ? groups?.find(g => g.id === task.group_id)?.name : null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <YStack padding="$4" gap="$2">
                    {/* Title row with branch icon for branch tasks */}
                    <XStack alignItems="center" gap="$2">
                        <AppText weight="semibold" size="xl" flex={1}>{task.title}</AppText>
                        {isBranchTask && (
                            <TouchableOpacity
                                onPress={handleGoToMotherTask}
                                style={{ padding: 4 }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <GitBranch size={20} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </XStack>
                    {isSharedTask && (
                        <Pressable
                            onPress={() => {
                                if (sharerProfile?.userId) {
                                    router.push(`/(app)/people-detail?userId=${sharerProfile.userId}` as any);
                                }
                            }}
                            disabled={!sharerProfile?.userId}
                        >
                            <XStack alignItems="center" gap={8}>
                                <Share2 size={14} color={colors.info} />
                                {sharerProfile ? (
                                    <XStack alignItems="center" gap={6}>
                                        <UserAvatar
                                            avatarUrl={sharerProfile.avatarUrl}
                                            fullName={sharerProfile.fullName}
                                            size={20}
                                        />
                                        <AppText size="sm" color={colors.info} weight="medium">
                                            {sharerProfile.fullName || 'Someone'}
                                        </AppText>
                                    </XStack>
                                ) : (
                                    <AppText size="sm" color={colors.info} weight="medium">
                                        Shared with you
                                    </AppText>
                                )}
                            </XStack>
                        </Pressable>
                    )}
                    {task.description && (
                        <AppText size="sm" variant="muted">
                            {task.description}
                        </AppText>
                    )}
                    {task.event_time && (
                        <XStack alignItems="center" gap={6}>
                            <Calendar size={14} color={colors.primary} />
                            <AppText size="sm" color={colors.primary} weight="medium">
                                {formatEventTime(task.event_time)}
                            </AppText>
                        </XStack>
                    )}
                    <XStack alignItems="center" justifyContent="space-between">
                        <XStack alignItems="center" gap={6}>
                            <AppText size="xs" variant="muted">
                                {completedCount}/{totalCount} completed
                            </AppText>
                            {(taskFetching || todosFetching) && !taskLoading && !todosLoading && (
                                <ActivityIndicator size="small" color={colors.primary} />
                            )}
                            {isOwner && taskShares && taskShares.length > 0 && (
                                <XStack alignItems="center" marginLeft={4}>
                                    {taskShares.slice(0, 5).map((share, index) => (
                                        <View
                                            key={share.id}
                                            style={{
                                                marginLeft: index === 0 ? 0 : -8,
                                                borderRadius: 11,
                                                borderWidth: 2,
                                                borderColor: colors.background,
                                                zIndex: 5 - index,
                                            }}
                                        >
                                            <UserAvatar
                                                avatarUrl={share.counterpart_avatar}
                                                fullName={share.counterpart_name}
                                                size={18}
                                            />
                                        </View>
                                    ))}
                                    {taskShares.length > 5 && (
                                        <View
                                            style={{
                                                marginLeft: -6,
                                                backgroundColor: colors.neoInset,
                                                borderRadius: 11,
                                                borderWidth: 2,
                                                borderColor: colors.background,
                                                width: 22,
                                                height: 22,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 0,
                                            }}
                                        >
                                            <AppText size="xs" weight="medium" color={colors.muted} style={{ fontSize: 9 }}>
                                                +{taskShares.length - 5}
                                            </AppText>
                                        </View>
                                    )}
                                </XStack>
                            )}
                        </XStack>
                        {groupName && (
                            <Pressable
                                onPress={() => router.push({ pathname: '/(app)/tasks', params: { groupId: task.group_id! } })}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <XStack
                                    alignItems="center"
                                    gap={4}
                                    paddingHorizontal={10}
                                    paddingVertical={4}
                                    borderRadius={12}
                                    backgroundColor={colors.successBackground}
                                >
                                    <Layers size={10} color={colors.primary} />
                                    <AppText size="xs" weight="medium" color={colors.primary}>{groupName}</AppText>
                                </XStack>
                            </Pressable>
                        )}
                    </XStack>
                </YStack>

                <YStack flex={1}>
                    <DraggableFlatList
                        data={todos ?? []}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        onDragEnd={handleDragEnd}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
                        ListHeaderComponent={
                            <XStack gap="$2" alignItems="flex-end" marginBottom="$3">
                                <YStack flex={1}>
                                    <Input
                                        value={newTodoTitle}
                                        onChangeText={setNewTodoTitle}
                                        placeholder="Add a step manually..."
                                        onSubmitEditing={handleAddTodo}
                                    />
                                </YStack>
                                <Button
                                    onPress={handleAddTodo}
                                    disabled={!newTodoTitle.trim() || addTodo.isPending}
                                    size="md"
                                    style={{ paddingHorizontal: 12 }}
                                >
                                    {addTodo.isPending ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Plus color="white" size={24} />
                                    )}
                                </Button>
                            </XStack>
                        }
                        ListEmptyComponent={
                            <YStack alignItems="center" justifyContent="center" paddingVertical="$10">
                                <AppText variant="muted">No steps yet</AppText>
                            </YStack>
                        }
                    />
                </YStack>
            </View>

            {/* Reminder edit sheet */}
            {reminderTodo && (
                <ReminderEditSheet
                    visible={!!reminderTodo}
                    onClose={() => setReminderTodo(null)}
                    todo={reminderTodo}
                    task={task}
                />
            )}

            {/* Branch info sheet */}
            {branchInfoTodo && (
                <BranchInfoSheet
                    visible={!!branchInfoTodo}
                    onClose={() => setBranchInfoTodo(null)}
                    todo={branchInfoTodo}
                    onGoToBranch={(branchTaskId) => {
                        router.push(`/(app)/task/${branchTaskId}`);
                    }}
                    onUnbranch={handleUnbranch}
                />
            )}

            <ConfirmDialog
                visible={branchDeleteAlert}
                title="Branched Todo"
                message="This todo has a branch. Please unbranch it first before deleting."
                confirmLabel="OK"
                variant="default"
                showCancel={false}
                onConfirm={() => setBranchDeleteAlert(false)}
                onCancel={() => setBranchDeleteAlert(false)}
            />

            <ConfirmDialog
                visible={motherTaskError !== null}
                title="Error"
                message={motherTaskError ?? ''}
                confirmLabel="OK"
                variant="default"
                showCancel={false}
                onConfirm={() => setMotherTaskError(null)}
                onCancel={() => setMotherTaskError(null)}
            />
        </GestureHandlerRootView>
    );
}
