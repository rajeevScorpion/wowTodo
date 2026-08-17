import { Modal, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { GitBranch, X, ArrowRight } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { useSemanticColors } from '../design-system/useSemanticColors';
import { Todo } from '../types';
import { useBranchesForTask } from '../features/tasks/api';

interface TaskBranchesSheetProps {
    visible: boolean;
    onClose: () => void;
    taskId: string;
    branchedTodos: Todo[];
    onGoToBranch: (branchTaskId: string) => void;
}

export function TaskBranchesSheet({
    visible,
    onClose,
    taskId,
    branchedTodos,
    onGoToBranch,
}: TaskBranchesSheetProps) {
    const colors = useSemanticColors();
    const branchedTodoIds = branchedTodos.map(t => t.id);
    const { data: branches, isLoading } = useBranchesForTask(taskId, branchedTodoIds);

    // Map parent todo IDs to their titles for display
    const todoTitleMap = new Map(branchedTodos.map(t => [t.id, t.title]));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable
                    style={[styles.sheet, { backgroundColor: colors.background }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
                        <XStack alignItems="center" gap={8}>
                            <GitBranch size={18} color={colors.primary} />
                            <AppText weight="semibold" size="md">Branches</AppText>
                        </XStack>
                        <Pressable onPress={onClose} hitSlop={8}>
                            <X size={20} color={colors.muted} />
                        </Pressable>
                    </XStack>

                    {/* Content */}
                    {isLoading ? (
                        <YStack alignItems="center" paddingVertical="$4">
                            <ActivityIndicator size="small" color={colors.primary} />
                        </YStack>
                    ) : !branches?.length ? (
                        <YStack alignItems="center" paddingVertical="$4">
                            <AppText variant="muted">No branches found</AppText>
                        </YStack>
                    ) : (
                        <ScrollView
                            style={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <YStack gap="$3">
                                {branches.map((branch) => {
                                    const bt = branch.branchTask;
                                    const progressPercent = bt.total_count > 0
                                        ? Math.round((bt.completed_count / bt.total_count) * 100)
                                        : 0;

                                    return (
                                        <YStack
                                            key={bt.id}
                                            padding="$3"
                                            borderRadius={12}
                                            borderWidth={1}
                                            borderColor={colors.borderColor}
                                            gap="$2"
                                        >
                                            {/* Parent todo reference */}
                                            <AppText size="xs" variant="muted" numberOfLines={1}>
                                                {todoTitleMap.get(branch.parentTodoId) ?? 'Todo'}
                                            </AppText>

                                            {/* Branch task title */}
                                            <AppText weight="medium" size="sm" numberOfLines={2}>
                                                {bt.title}
                                            </AppText>

                                            {/* Progress */}
                                            <XStack alignItems="center" gap={6}>
                                                <AppText size="xs" variant="muted">
                                                    {bt.completed_count}/{bt.total_count}
                                                </AppText>
                                                {bt.total_count > 0 && (
                                                    <YStack
                                                        flex={1}
                                                        height={4}
                                                        borderRadius={2}
                                                        backgroundColor={colors.borderColor}
                                                        overflow="hidden"
                                                    >
                                                        <YStack
                                                            height={4}
                                                            borderRadius={2}
                                                            backgroundColor={colors.primary}
                                                            style={{
                                                                width: `${progressPercent}%` as any,
                                                            }}
                                                        />
                                                    </YStack>
                                                )}
                                            </XStack>

                                            {/* Go to branch button */}
                                            <Button
                                                size="sm"
                                                onPress={() => {
                                                    onGoToBranch(bt.id);
                                                    onClose();
                                                }}
                                                style={{ alignSelf: 'flex-end' }}
                                            >
                                                <XStack alignItems="center" gap="$1.5">
                                                    <ArrowRight size={14} color="white" />
                                                    <AppText size="xs" weight="medium" color="white">Go to Branch</AppText>
                                                </XStack>
                                            </Button>
                                        </YStack>
                                    );
                                })}
                            </YStack>
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 36,
        maxHeight: '70%',
    },
    scrollContent: {
        flexGrow: 0,
    },
});
