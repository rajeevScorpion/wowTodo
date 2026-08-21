import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, ActivityIndicator, View, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshCw, Sparkles, Plus, X, Check, Clock, Calendar, ChevronDown, Layers, HelpCircle } from 'lucide-react-native';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { AppText } from '../../src/components/ui/AppText';
import { Screen } from '../../src/components/ui/Screen';
import { AgentStatus } from '../../src/components/AgentStatus';
import { useAuth } from '../../src/providers/AuthProvider';
import { generateTask, AgentClarificationNeeded } from '../../src/services/ai';
import type { PipelineStage } from '../../src/services/ai/agentStatus';
import { useCreateTaskWithTodos } from '../../src/features/tasks/api';
import { useGroups, useCreateGroup } from '../../src/features/groups/api';
import { useReminderSettings } from '../../src/features/reminders/api';
import { scheduleRemindersForTodos } from '../../src/services/reminders/scheduler';
import { AIGeneratedTask, AIGeneratedTodo, AppLanguage, Task, Todo, TaskGroup } from '../../src/types';
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

export default function ReviewScreen() {
    const { text = '', source = 'voice', lang = 'en', autoGenerate = '' } = useLocalSearchParams<{ text: string; source: string; lang: string; autoGenerate: string }>();
    const language = (lang === 'hi' ? 'hi' : 'en') as AppLanguage;
    const router = useRouter();
    const { user } = useAuth();
    const createTask = useCreateTaskWithTodos();
    const { data: groups } = useGroups();
    const createGroup = useCreateGroup();
    const { data: reminderSettings } = useReminderSettings();
    const colors = useSemanticColors();

    const [editedText, setEditedText] = useState(text);

    // Seeded true when this screen was told to auto-generate, because the effect
    // that starts generation runs *after* the first paint. Left at false, that
    // paint renders the text-editing screen — a one-frame flash of exactly the
    // step this phase removed.
    const [isGenerating, setIsGenerating] = useState(
        autoGenerate === '1' && text.trim().length > 0,
    );

    // Where the pipeline has got to, for the progressive status line.
    //
    // Starts at `understanding` rather than at nothing: by the time this screen
    // mounts, transcription is already done and the request is about to go out.
    // It also stays here for the whole legacy fallback, which emits no stages —
    // truthful, if uninformative, and the bar stops rather than inventing motion.
    const [stage, setStage] = useState<PipelineStage>({ stage: 'understanding' });

    // The planner declined to guess and asked something instead.
    const [clarification, setClarification] = useState<string | null>(null);

    // Group picker state (shown after AI generates)
    const [aiResult, setAiResult] = useState<AIGeneratedTask | null>(null);
    // selectedGroupId = existing group ID, selectedNewGroupName = new group name to create, both null = "None"
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedNewGroupName, setSelectedNewGroupName] = useState<string | null>(null);

    // Todo list expanded
    const [showTodos, setShowTodos] = useState(false);

    // Inline new group creation
    const [showNewGroupInput, setShowNewGroupInput] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [userCreatedGroup, setUserCreatedGroup] = useState<TaskGroup | null>(null);

    const handleGenerateTask = useCallback(async () => {
        if (!editedText.trim() || !user) return;
        setIsGenerating(true);
        setClarification(null);
        setStage({ stage: 'understanding' });
        try {
            const groupNames = groups?.map(g => g.name) ?? [];
            const result = await generateTask(editedText.trim(), groupNames, language, {
                onStage: setStage,
            });
            setAiResult(result);

            // Match AI-selected group against existing groups
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
            // A question is the planner working, not failing. It gets the editable
            // text back with the question above it — a checkpoint that appears when
            // the system is genuinely unsure, instead of on every single utterance
            // the way the old review screen did.
            if (error instanceof AgentClarificationNeeded) {
                setClarification(error.question);
                return;
            }
            Alert.alert(
                'Failed to generate task',
                error.message || 'Something went wrong. Please try again.',
            );
        } finally {
            setIsGenerating(false);
        }
    }, [editedText, user, groups, language]);

    // Auto-generate on arrival — every path reaches this screen ready to plan.
    //
    // The latch is set only once generation actually starts. Latching on the
    // first render instead would strand the screen whenever the session had not
    // resolved yet: `handleGenerateTask` returns immediately without a `user`,
    // the retry is already marked as done, and the status line spins forever with
    // nothing behind it. Depending on `user` means the run happens as soon as it
    // is genuinely possible.
    const hasAutoGenerated = useRef(false);
    useEffect(() => {
        if (autoGenerate !== '1' || hasAutoGenerated.current) return;
        if (!user || !editedText.trim()) return;
        hasAutoGenerated.current = true;
        handleGenerateTask();
    }, [autoGenerate, user, editedText, handleGenerateTask]);

    const handleConfirmCreate = useCallback(async () => {
        if (!aiResult || !user) return;
        setIsGenerating(true);
        try {
            let groupId: string | null = null;

            if (selectedNewGroupName) {
                // Create a new group (AI-suggested or user-created)
                const newGroup = await createGroup.mutateAsync({
                    user_id: user.id,
                    name: selectedNewGroupName,
                });
                groupId = newGroup.id;
            } else if (selectedGroupId) {
                groupId = selectedGroupId;
            }

            const result = await createTask.mutateAsync({
                task: {
                    user_id: user.id,
                    title: aiResult.title,
                    description: aiResult.description,
                    source_text: editedText.trim(),
                    source_type: source as 'text' | 'voice',
                    group_id: groupId,
                    event_time: aiResult.event_time,
                    // Provenance (migration 0017). Null on the legacy path, which
                    // is exactly how the two are told apart later — without it, a
                    // bad batch of tasks cannot be traced back to a specialist or
                    // a prompt version.
                    agent: aiResult.agent ?? null,
                    ai_confidence: aiResult.confidence ?? null,
                    prompt_version: aiResult.prompt_version ?? null,
                },
                todos: aiResult.todos,
            });

            // Navigate immediately — task is persisted, don't block on reminders
            router.replace(`/(app)/task/${result.task.id}`);

            // Fire-and-forget: schedule reminders in background
            // No state updates after this point — component is unmounting
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
                'Failed to create task',
                error.message || 'Something went wrong. Please try again.',
            );
        }
    }, [aiResult, user, selectedNewGroupName, selectedGroupId, editedText, source, createGroup, createTask, router, reminderSettings]);

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

    const handleRetry = () => {
        router.back();
    };

    const handleBackToEdit = () => {
        setAiResult(null);
        setSelectedGroupId(null);
        setSelectedNewGroupName(null);
    };

    // Count todos with time info
    const todosWithTime = aiResult?.todos.filter(t => t.due_date || t.due_time) ?? [];

    // After AI has generated — show group picker + confirm
    if (aiResult) {
        const isNoneSelected = selectedGroupId === null && selectedNewGroupName === null;

        // Build the list of ranked existing groups to show
        const rankedExistingGroups = (aiResult.groups.existing_ranked ?? [])
            .map(name => groups?.find(g => g.name.toLowerCase() === name.toLowerCase()))
            .filter((g): g is NonNullable<typeof g> => g != null);

        // The AI-selected group if it matches an existing group
        const selectedExistingMatch = groups?.find(
            g => g.name.toLowerCase() === aiResult.groups.selected.toLowerCase(),
        );

        // New suggestions from AI (exclude the selected one and any that match existing groups)
        const newSuggestions = (aiResult.groups.new_suggestions ?? []).filter(
            name =>
                name.toLowerCase() !== aiResult.groups.selected.toLowerCase() &&
                !groups?.some(g => g.name.toLowerCase() === name.toLowerCase()),
        );

        // Is the AI-selected group a new suggestion (not existing)?
        const isSelectedNew = !selectedExistingMatch;

        return (
            <Screen edges={['left', 'right']} scroll>
                <YStack flex={1} gap="$4" padding="$2">
                    {/* AI result summary */}
                    <YStack gap="$1">
                        <AppText weight="semibold" size="lg">{aiResult.title}</AppText>
                        <AppText variant="muted" size="sm">{aiResult.description}</AppText>

                        {/* Event time */}
                        {aiResult.event_time && (
                            <XStack alignItems="center" gap={6} paddingTop="$1">
                                <Calendar size={14} color={colors.primary} />
                                <AppText size="sm" color={colors.primary} weight="medium">
                                    {formatEventTime(aiResult.event_time)}
                                </AppText>
                            </XStack>
                        )}

                        {/* Steps count — tap to expand */}
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

                    {/* Expandable todo list with times */}
                    {showTodos && (
                        <YStack gap="$1" paddingLeft="$1">
                            {aiResult.todos.map((todo, index) => {
                                const dueStr = formatTodoDue(todo.due_date, todo.due_time);
                                return (
                                    <XStack key={index} alignItems="center" gap="$2" paddingVertical={4}>
                                        <AppText variant="muted" size="xs" style={{ width: 20 }}>{index + 1}.</AppText>
                                        <YStack flex={1}>
                                            <AppText size="sm">{todo.title}</AppText>
                                            {todo.note && (
                                                <AppText size="xs" variant="muted">{todo.note}</AppText>
                                            )}
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

                    {/* Group selection */}
                    <YStack gap="$2">
                        <XStack alignItems="center" gap={6}>
                            <Layers size={16} color={colors.primary} />
                            <AppText weight="medium" size="md">Group</AppText>
                        </XStack>
                        <AppText variant="muted" size="xs">Choose the right group or create one</AppText>

                        <View style={styles.chipGrid}>
                            {/* AI-selected group (highlighted) */}
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

                            {/* AI-ranked existing groups */}
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

                            {/* AI new suggestions */}
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

                            {/* None chip */}
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

                            {/* + New chip */}
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

                        {/* Inline new group input */}
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
                            onPress={handleBackToEdit}
                            disabled={isGenerating}
                            size="md"
                        >
                            {/* The escape hatch from the removed review step. It is
                                no longer mandatory, but it must still be obvious —
                                a misheard word has to be fixable without redoing
                                the recording. */}
                            <AppText weight="medium" color={colors.primary}>
                                {source === 'voice' ? 'Wrong transcript?' : 'Edit Text'}
                            </AppText>
                        </Button>

                        <Button
                            onPress={handleConfirmCreate}
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

    // Planning in flight — the progressive status line.
    //
    // Reached both by the auto-generate pass and by a re-submit from the
    // clarification screen, so the wait looks the same wherever it comes from.
    if (isGenerating) {
        return (
            <Screen edges={['left', 'right']}>
                <YStack flex={1} alignItems="center" justifyContent="center" padding="$2">
                    <AgentStatus stage={stage} language={language} />
                </YStack>
            </Screen>
        );
    }

    // Text editing — now reached only when it is actually useful: the planner
    // asked a question, or the user tapped "Wrong transcript?".
    return (
        <Screen edges={['left', 'right']}>
            <YStack flex={1} gap="$4" padding="$2">
                {clarification ? (
                    <XStack alignItems="flex-start" gap="$2">
                        <HelpCircle size={18} color={colors.primary} style={{ marginTop: 2 }} />
                        <YStack flex={1} gap="$1">
                            <AppText size="md" weight="medium">{clarification}</AppText>
                            <AppText variant="muted" size="sm">
                                Add the detail below and try again.
                            </AppText>
                        </YStack>
                    </XStack>
                ) : (
                    <AppText variant="muted" size="md">
                        Review and edit your text before creating a task:
                    </AppText>
                )}

                <Input
                    value={editedText}
                    onChangeText={setEditedText}
                    placeholder="Describe your task..."
                    multiline
                    numberOfLines={5}
                    editable={!isGenerating}
                    textAlignVertical="top"
                    style={{ height: undefined, minHeight: 120 }}
                />

                <XStack gap="$2" justifyContent="flex-end">
                    <Button
                        variant="outline"
                        onPress={handleRetry}
                        disabled={isGenerating}
                        size="sm"
                    >
                        <XStack alignItems="center" gap="$1.5">
                            <RefreshCw size={14} color={colors.primary} />
                            <AppText weight="medium" color={colors.primary}>Retry</AppText>
                        </XStack>
                    </Button>

                    <Button
                        onPress={handleGenerateTask}
                        disabled={!editedText.trim() || isGenerating}
                        size="sm"
                    >
                        {isGenerating ? (
                            <XStack alignItems="center" gap="$2">
                                <ActivityIndicator color="white" size="small" />
                                <AppText weight="medium" color="white">
                                    AI is thinking...
                                </AppText>
                            </XStack>
                        ) : (
                            <XStack alignItems="center" gap="$1.5">
                                <Sparkles size={14} color="white" />
                                <AppText weight="medium" color="white">Create Task</AppText>
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
