import { useState, useCallback, useRef } from 'react';
import { Alert, ActivityIndicator, View, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshCw, Sparkles, Check, Clock, Calendar, ChevronDown, Layers, Plus, X, GitBranch } from 'lucide-react-native';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { AppText } from '../../src/components/ui/AppText';
import { Screen } from '../../src/components/ui/Screen';
import { VoiceInput } from '../../src/components/VoiceInput';
import { useAuth } from '../../src/providers/AuthProvider';
import { generateBranch, transcribeVoice } from '../../src/services/ai';
import { useTask, useTaskTodos, useCreateBranch } from '../../src/features/tasks/api';
import { useGroups, useCreateGroup } from '../../src/features/groups/api';
import { useProfile } from '../../src/features/profile/api';
import { useReminderSettings } from '../../src/features/reminders/api';
import { scheduleRemindersForTodos } from '../../src/services/reminders/scheduler';
import { useVoiceRecording } from '../../src/hooks/useVoiceRecording';
import { AIGeneratedTask, AIGeneratedTodo, AppLanguage, BranchContext, RecordingState, TaskGroup } from '../../src/types';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';

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

function formatTodoDue(dueDate: string | null, dueTime: string | null): string | null {
    if (!dueDate) return null;
    const date = new Date(dueDate + 'T00:00:00');
    const datePart = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (dueTime) {
        const [h, m] = dueTime.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setHours(h, m);
        const timePart = timeDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        return `${datePart}, ${timePart}`;
    }
    return datePart;
}

export default function BranchScreen() {
    const { todoId = '', taskId = '', lang = 'en' } = useLocalSearchParams<{
        todoId: string;
        taskId: string;
        lang: string;
    }>();
    const language = (lang === 'hi' ? 'hi' : 'en') as AppLanguage;
    const router = useRouter();
    const { user } = useAuth();
    const colors = useSemanticColors();

    // Data hooks
    const { data: motherTask, isLoading: taskLoading } = useTask(taskId);
    const { data: motherTodos, isLoading: todosLoading } = useTaskTodos(taskId);
    const { data: groups } = useGroups();
    const { data: profile } = useProfile();
    const createBranch = useCreateBranch();
    const createGroup = useCreateGroup();
    const { data: reminderSettings } = useReminderSettings();

    // State
    const [additionalContext, setAdditionalContext] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiResult, setAiResult] = useState<AIGeneratedTask | null>(null);

    // Group picker state
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedNewGroupName, setSelectedNewGroupName] = useState<string | null>(null);
    const [showTodos, setShowTodos] = useState(false);
    const [showNewGroupInput, setShowNewGroupInput] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [userCreatedGroup, setUserCreatedGroup] = useState<TaskGroup | null>(null);

    // Find the specific todo being branched
    const branchedTodo = motherTodos?.find(t => t.id === todoId);

    // Recording, permissions, the audio session and transcription all live in
    // the shared hook — this screen used to duplicate that logic.
    const { recordingState, startVoiceRecording, stopVoiceRecording, cancelRecording } =
        useVoiceRecording(language);

    const handleStartRecording = useCallback(async () => {
        await startVoiceRecording();
    }, [startVoiceRecording]);

    const handleStopRecording = useCallback(async () => {
        const transcript = await stopVoiceRecording();
        if (!transcript) return;
        // Append transcript to additional context
        setAdditionalContext(prev => (prev ? `${prev}
${transcript}` : transcript));
    }, [stopVoiceRecording]);

    const handleCancelRecording = useCallback(async () => {
        await cancelRecording();
    }, [cancelRecording]);

    // Generate branch with AI
    const handleGenerate = useCallback(async () => {
        if (!motherTask || !branchedTodo || !motherTodos || !user) return;

        setIsGenerating(true);
        try {
            const branchContext: BranchContext = {
                motherTask: {
                    title: motherTask.title,
                    description: motherTask.description,
                },
                motherTodos: motherTodos.map(t => ({ title: t.title, order: t.order })),
                branchedTodo: { title: branchedTodo.title, order: branchedTodo.order },
                userProfile: profile ? {
                    profession: profile.profession,
                    city: profile.city,
                } : undefined,
                additionalContext: additionalContext.trim(),
            };

            const groupNames = groups?.map(g => g.name) ?? [];
            const result = await generateBranch(branchContext, groupNames, language);
            setAiResult(result);

            // Match AI-selected group
            const selectedName = result.groups.selected;
            const existingMatch = groups?.find(
                g => g.name.toLowerCase() === selectedName.toLowerCase(),
            );
            if (existingMatch) {
                setSelectedGroupId(existingMatch.id);
                setSelectedNewGroupName(null);
            } else {
                setSelectedGroupId(null);
                setSelectedNewGroupName(selectedName);
            }
        } catch (error: any) {
            Alert.alert(
                'Failed to generate branch',
                error.message || 'Something went wrong. Please try again.',
            );
        } finally {
            setIsGenerating(false);
        }
    }, [motherTask, branchedTodo, motherTodos, user, additionalContext, groups, profile, language]);

    // Confirm and create branch
    const handleConfirm = useCallback(async () => {
        if (!aiResult || !user || !todoId) return;
        setIsGenerating(true);
        try {
            let groupId: string | null = null;

            if (selectedNewGroupName) {
                const newGroup = await createGroup.mutateAsync({
                    user_id: user.id,
                    name: selectedNewGroupName,
                });
                groupId = newGroup.id;
            } else if (selectedGroupId) {
                groupId = selectedGroupId;
            }

            const result = await createBranch.mutateAsync({
                task: {
                    user_id: user.id,
                    title: aiResult.title,
                    description: aiResult.description,
                    source_text: additionalContext.trim() || branchedTodo?.title || '',
                    source_type: 'text',
                    group_id: groupId,
                    event_time: aiResult.event_time,
                },
                todos: aiResult.todos,
                parentTodoId: todoId,
            });

            // Navigate to the new branch task
            router.replace(`/(app)/task/${result.task.id}`);

            // Fire-and-forget: schedule reminders
            if (reminderSettings && reminderSettings.length > 0) {
                const todosWithDates = result.todos.filter(
                    t => t.due_date || result.task.event_time,
                );
                if (todosWithDates.length > 0) {
                    scheduleRemindersForTodos(todosWithDates, result.task, reminderSettings)
                        .catch(err => console.warn('Failed to schedule reminders:', err));
                }
            }
        } catch (error: any) {
            setIsGenerating(false);
            Alert.alert(
                'Failed to create branch',
                error.message || 'Something went wrong. Please try again.',
            );
        }
    }, [aiResult, user, todoId, selectedNewGroupName, selectedGroupId, additionalContext, branchedTodo, createBranch, createGroup, router, reminderSettings]);

    // Retry: go back to input phase, keep context
    const handleRetry = () => {
        setAiResult(null);
        setSelectedGroupId(null);
        setSelectedNewGroupName(null);
        setShowTodos(false);
    };

    const handleCreateNewGroup = useCallback(async () => {
        if (!newGroupName.trim() || !user) return;
        try {
            const newGroup = await createGroup.mutateAsync({
                user_id: user.id,
                name: newGroupName.trim(),
            });
            setSelectedGroupId(newGroup.id);
            setSelectedNewGroupName(null);
            setUserCreatedGroup(newGroup);
            setShowNewGroupInput(false);
            setNewGroupName('');
        } catch (error: any) {
            Alert.alert('Failed to create group', error.message);
        }
    }, [newGroupName, user, createGroup]);

    const handleSelectExistingGroup = (groupId: string) => {
        setSelectedGroupId(groupId);
        setSelectedNewGroupName(null);
    };

    const handleSelectNewSuggestion = (name: string) => {
        setSelectedGroupId(null);
        setSelectedNewGroupName(name);
    };

    const handleSelectNone = () => {
        setSelectedGroupId(null);
        setSelectedNewGroupName(null);
    };

    // Loading state
    if (taskLoading || todosLoading) {
        return (
            <Screen edges={['left', 'right']}>
                <YStack flex={1} alignItems="center" justifyContent="center">
                    <ActivityIndicator size="large" color={colors.primary} />
                </YStack>
            </Screen>
        );
    }

    if (!motherTask || !branchedTodo) {
        return (
            <Screen edges={['left', 'right']}>
                <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
                    <AppText variant="error">Task or todo not found</AppText>
                </YStack>
            </Screen>
        );
    }

    // ========================================
    // Phase 2: AI Result + Confirmation
    // ========================================
    if (aiResult) {
        const isNoneSelected = selectedGroupId === null && selectedNewGroupName === null;
        const rankedExistingGroups = (aiResult.groups.existing_ranked ?? [])
            .map(name => groups?.find(g => g.name.toLowerCase() === name.toLowerCase()))
            .filter((g): g is NonNullable<typeof g> => g != null);

        const selectedExistingMatch = groups?.find(
            g => g.name.toLowerCase() === aiResult.groups.selected.toLowerCase(),
        );
        const newSuggestions = (aiResult.groups.new_suggestions ?? []).filter(
            name =>
                name.toLowerCase() !== aiResult.groups.selected.toLowerCase() &&
                !groups?.some(g => g.name.toLowerCase() === name.toLowerCase()),
        );
        const isSelectedNew = !selectedExistingMatch;
        const todosWithTime = aiResult.todos.filter(t => t.due_date || t.due_time);

        return (
            <Screen edges={['left', 'right']} scroll>
                <YStack flex={1} gap="$4" padding="$2">
                    {/* Branch indicator */}
                    <XStack alignItems="center" gap={6}>
                        <GitBranch size={16} color={colors.primary} />
                        <AppText size="xs" variant="muted">
                            Branch of "{branchedTodo.title}"
                        </AppText>
                    </XStack>

                    {/* AI result summary */}
                    <YStack gap="$1">
                        <AppText weight="semibold" size="lg">{aiResult.title}</AppText>
                        <AppText variant="muted" size="sm">{aiResult.description}</AppText>

                        {aiResult.event_time && (
                            <XStack alignItems="center" gap={6} paddingTop="$1">
                                <Calendar size={14} color={colors.primary} />
                                <AppText size="sm" color={colors.primary} weight="medium">
                                    {formatEventTime(aiResult.event_time)}
                                </AppText>
                            </XStack>
                        )}

                        <Pressable onPress={() => setShowTodos(!showTodos)}>
                            <XStack alignItems="center" gap={6} paddingTop="$1">
                                <ChevronDown
                                    size={14}
                                    color={colors.muted}
                                    style={{ transform: [{ rotate: showTodos ? '0deg' : '-90deg' }] }}
                                />
                                <AppText variant="muted" size="sm" weight="medium">
                                    {aiResult.todos.length} steps generated
                                    {todosWithTime.length > 0 && ` · ${todosWithTime.length} with time`}
                                </AppText>
                            </XStack>
                        </Pressable>
                    </YStack>

                    {/* Expandable todo list */}
                    {showTodos && (
                        <YStack gap="$1" paddingLeft="$1">
                            {aiResult.todos.map((todo, index) => {
                                const dueStr = formatTodoDue(todo.due_date, todo.due_time);
                                return (
                                    <XStack key={index} alignItems="center" gap="$2" paddingVertical={4}>
                                        <AppText variant="muted" size="xs" style={{ width: 20 }}>{index + 1}.</AppText>
                                        <YStack flex={1}>
                                            <AppText size="sm">{todo.title}</AppText>
                                            {dueStr && (
                                                <XStack alignItems="center" gap={4}>
                                                    <Clock size={10} color={colors.primary} />
                                                    <AppText size="xs" color={colors.primary}>{dueStr}</AppText>
                                                </XStack>
                                            )}
                                        </YStack>
                                    </XStack>
                                );
                            })}
                        </YStack>
                    )}

                    {/* Group selection (same pattern as review.tsx) */}
                    <YStack gap="$2">
                        <XStack alignItems="center" gap={6}>
                            <Layers size={16} color={colors.primary} />
                            <AppText weight="medium" size="md">Group</AppText>
                        </XStack>
                        <AppText variant="muted" size="xs">Choose the right group or create one</AppText>

                        <View style={styles.chipGrid}>
                            {isSelectedNew ? (
                                <Pressable
                                    onPress={() => handleSelectNewSuggestion(aiResult.groups.selected)}
                                    style={[
                                        styles.chip,
                                        styles.chipSuggested,
                                        {
                                            borderColor: colors.primary,
                                            backgroundColor: selectedNewGroupName === aiResult.groups.selected ? colors.primary : colors.background,
                                        },
                                    ]}
                                >
                                    <XStack alignItems="center" gap={4}>
                                        <Sparkles size={10} color={selectedNewGroupName === aiResult.groups.selected ? 'white' : colors.primary} />
                                        <AppText
                                            size="xs"
                                            weight="medium"
                                            color={selectedNewGroupName === aiResult.groups.selected ? 'white' : colors.primary}
                                        >
                                            {aiResult.groups.selected}
                                        </AppText>
                                    </XStack>
                                </Pressable>
                            ) : selectedExistingMatch ? (
                                <Pressable
                                    onPress={() => handleSelectExistingGroup(selectedExistingMatch.id)}
                                    style={[
                                        styles.chip,
                                        styles.chipSuggested,
                                        {
                                            borderColor: colors.primary,
                                            backgroundColor: selectedGroupId === selectedExistingMatch.id ? colors.primary : colors.background,
                                        },
                                    ]}
                                >
                                    <XStack alignItems="center" gap={4}>
                                        <Sparkles size={10} color={selectedGroupId === selectedExistingMatch.id ? 'white' : colors.primary} />
                                        <AppText
                                            size="xs"
                                            weight="medium"
                                            color={selectedGroupId === selectedExistingMatch.id ? 'white' : colors.primary}
                                        >
                                            {selectedExistingMatch.name}
                                        </AppText>
                                    </XStack>
                                </Pressable>
                            ) : null}

                            {rankedExistingGroups.map(group => (
                                <Pressable
                                    key={group.id}
                                    onPress={() => handleSelectExistingGroup(group.id)}
                                    style={[styles.chip, { backgroundColor: selectedGroupId === group.id ? colors.primary : colors.cardBackground }]}
                                >
                                    <AppText
                                        size="xs"
                                        weight="medium"
                                        color={selectedGroupId === group.id ? 'white' : colors.secondary}
                                    >
                                        {group.name}
                                    </AppText>
                                </Pressable>
                            ))}

                            {newSuggestions.map(name => (
                                <Pressable
                                    key={name}
                                    onPress={() => handleSelectNewSuggestion(name)}
                                    style={[
                                        styles.chip,
                                        styles.chipSuggested,
                                        {
                                            borderColor: colors.primary,
                                            backgroundColor: selectedNewGroupName === name ? colors.primary : colors.background,
                                        },
                                    ]}
                                >
                                    <XStack alignItems="center" gap={4}>
                                        <Sparkles size={10} color={selectedNewGroupName === name ? 'white' : colors.primary} />
                                        <AppText
                                            size="xs"
                                            weight="medium"
                                            color={selectedNewGroupName === name ? 'white' : colors.primary}
                                        >
                                            {name}
                                        </AppText>
                                    </XStack>
                                </Pressable>
                            ))}

                            {/* User-created group chip */}
                            {userCreatedGroup && selectedExistingMatch?.id !== userCreatedGroup.id && !rankedExistingGroups.find(g => g.id === userCreatedGroup.id) && (
                                <Pressable
                                    onPress={() => handleSelectExistingGroup(userCreatedGroup.id)}
                                    style={[styles.chip, { backgroundColor: selectedGroupId === userCreatedGroup.id ? colors.primary : colors.cardBackground }]}
                                >
                                    <AppText
                                        size="xs"
                                        weight="medium"
                                        color={selectedGroupId === userCreatedGroup.id ? 'white' : colors.secondary}
                                    >
                                        {userCreatedGroup.name}
                                    </AppText>
                                </Pressable>
                            )}

                            <Pressable
                                onPress={handleSelectNone}
                                style={[styles.chip, { backgroundColor: isNoneSelected ? colors.primary : colors.cardBackground }]}
                            >
                                <AppText
                                    size="xs"
                                    weight="medium"
                                    color={isNoneSelected ? 'white' : colors.secondary}
                                >
                                    None
                                </AppText>
                            </Pressable>

                            <Pressable
                                onPress={() => setShowNewGroupInput(true)}
                                style={[styles.chip, styles.chipOutline, { borderColor: colors.borderColor }]}
                            >
                                <XStack alignItems="center" gap={4}>
                                    <Plus size={12} color={colors.muted} />
                                    <AppText size="xs" weight="medium" color={colors.muted}>New</AppText>
                                </XStack>
                            </Pressable>
                        </View>

                        {showNewGroupInput && (
                            <XStack gap="$2" alignItems="center">
                                <YStack flex={1}>
                                    <Input
                                        value={newGroupName}
                                        onChangeText={setNewGroupName}
                                        placeholder="Group name (1-2 words)"
                                        autoFocus
                                    />
                                </YStack>
                                <Button
                                    size="sm"
                                    onPress={handleCreateNewGroup}
                                    disabled={!newGroupName.trim() || createGroup.isPending}
                                >
                                    <Check size={16} color="white" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onPress={() => { setShowNewGroupInput(false); setNewGroupName(''); }}
                                >
                                    <X size={16} color={colors.muted} />
                                </Button>
                            </XStack>
                        )}
                    </YStack>

                    {/* Action buttons */}
                    <XStack gap="$3" justifyContent="center" paddingTop="$2">
                        <Button
                            variant="outline"
                            onPress={handleRetry}
                            disabled={isGenerating}
                            size="md"
                        >
                            <XStack alignItems="center" gap="$1.5">
                                <RefreshCw size={14} color={colors.primary} />
                                <AppText weight="medium" color={colors.primary}>Retry</AppText>
                            </XStack>
                        </Button>

                        <Button
                            onPress={handleConfirm}
                            disabled={isGenerating}
                            size="md"
                        >
                            {isGenerating ? (
                                <XStack alignItems="center" gap="$2">
                                    <ActivityIndicator color="white" size="small" />
                                    <AppText weight="medium" color="white">Creating...</AppText>
                                </XStack>
                            ) : (
                                <XStack alignItems="center" gap="$1.5">
                                    <Check size={16} color="white" />
                                    <AppText weight="medium" color="white">Confirm</AppText>
                                </XStack>
                            )}
                        </Button>
                    </XStack>
                </YStack>
            </Screen>
        );
    }

    // ========================================
    // Phase 1: Context Input
    // ========================================
    const isProcessing = isGenerating || recordingState !== 'idle';

    return (
        <Screen edges={['left', 'right']} scroll>
            <YStack flex={1} gap="$4" padding="$2">
                {/* Branch indicator */}
                <XStack alignItems="center" gap={6}>
                    <GitBranch size={16} color={colors.primary} />
                    <AppText size="sm" weight="medium" color={colors.primary}>Create Branch</AppText>
                </XStack>

                {/* Mother task context */}
                <YStack gap="$1" padding="$3" borderRadius="$3" backgroundColor={colors.cardBackground}>
                    <AppText size="xs" variant="muted" weight="medium">MOTHER TASK</AppText>
                    <AppText weight="semibold" size="md">{motherTask.title}</AppText>
                    {motherTask.description && (
                        <AppText size="sm" variant="muted">{motherTask.description}</AppText>
                    )}
                </YStack>

                {/* Mother task todos with branched one highlighted */}
                <YStack gap="$1">
                    <AppText size="xs" variant="muted" weight="medium">STEPS</AppText>
                    {motherTodos?.map((todo, index) => {
                        const isBranched = todo.id === todoId;
                        return (
                            <XStack
                                key={todo.id}
                                alignItems="center"
                                gap="$2"
                                paddingVertical={6}
                                paddingHorizontal="$2"
                                borderRadius="$2"
                                borderWidth={isBranched ? 1.5 : 0}
                                borderColor={isBranched ? colors.primary : 'transparent'}
                                backgroundColor={isBranched ? colors.cardBackground : 'transparent'}
                            >
                                <AppText
                                    size="xs"
                                    color={isBranched ? colors.primary : colors.muted}
                                    style={{ width: 20 }}
                                >
                                    {index + 1}.
                                </AppText>
                                <AppText
                                    size="sm"
                                    weight={isBranched ? 'semibold' : 'normal'}
                                    color={isBranched ? colors.color : colors.muted}
                                    flex={1}
                                >
                                    {todo.title}
                                </AppText>
                                {isBranched && (
                                    <GitBranch size={14} color={colors.primary} />
                                )}
                            </XStack>
                        );
                    })}
                </YStack>

                {/* Additional context input */}
                <YStack gap="$2">
                    <AppText size="xs" variant="muted" weight="medium">ADDITIONAL CONTEXT</AppText>
                    <AppText size="xs" variant="muted">
                        Tell the AI what you need help with for this step
                    </AppText>
                    <Input
                        value={additionalContext}
                        onChangeText={setAdditionalContext}
                        placeholder="e.g., I want to make paneer from scratch at home..."
                        multiline
                        numberOfLines={4}
                        editable={!isProcessing}
                        textAlignVertical="top"
                        style={{ height: undefined, minHeight: 100 }}
                    />
                </YStack>

                {/* Action row: Voice + Generate */}
                <XStack gap="$2" justifyContent="flex-end" alignItems="center">
                    <VoiceInput
                        recordingState={recordingState}
                        onStartRecording={handleStartRecording}
                        onStopRecording={handleStopRecording}
                        onCancelRecording={handleCancelRecording}
                        language={language}
                    />

                    <Button
                        onPress={handleGenerate}
                        disabled={isProcessing}
                        size="sm"
                    >
                        {isGenerating ? (
                            <XStack alignItems="center" gap="$2">
                                <ActivityIndicator color="white" size="small" />
                                <AppText weight="medium" color="white">AI is thinking...</AppText>
                            </XStack>
                        ) : (
                            <XStack alignItems="center" gap="$1.5">
                                <Sparkles size={14} color="white" />
                                <AppText weight="medium" color="white">Generate Branch</AppText>
                            </XStack>
                        )}
                    </Button>
                </XStack>
            </YStack>
        </Screen>
    );
}

const styles = StyleSheet.create({
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    chipSuggested: {
        borderWidth: 1,
    },
    chipOutline: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
});
