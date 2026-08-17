import { Modal, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { GitBranch, X, ArrowRight, Unlink } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { useSemanticColors } from '../design-system/useSemanticColors';
import { Todo } from '../types';
import { useBranchForTodo } from '../features/tasks/api';

interface BranchInfoSheetProps {
    visible: boolean;
    onClose: () => void;
    todo: Todo;
    onGoToBranch: (branchTaskId: string) => void;
    onUnbranch: (branchTaskId: string, parentTodoId: string) => void;
}

export function BranchInfoSheet({
    visible,
    onClose,
    todo,
    onGoToBranch,
    onUnbranch,
}: BranchInfoSheetProps) {
    const colors = useSemanticColors();
    const { data: branchTask, isLoading } = useBranchForTodo(todo.id);

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
                            <AppText weight="semibold" size="md">Branch Info</AppText>
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
                    ) : !branchTask ? (
                        <YStack alignItems="center" paddingVertical="$4">
                            <AppText variant="muted">Branch not found</AppText>
                        </YStack>
                    ) : (
                        <YStack gap="$3">
                            {/* Branch task title */}
                            <YStack gap="$1">
                                <AppText weight="semibold" size="md">
                                    {branchTask.title}
                                </AppText>
                                {branchTask.description && (
                                    <AppText size="sm" variant="muted">
                                        {branchTask.description}
                                    </AppText>
                                )}
                            </YStack>

                            {/* Progress */}
                            <XStack alignItems="center" gap={6}>
                                <AppText size="sm" variant="muted">
                                    {branchTask.completed_count}/{branchTask.total_count} completed
                                </AppText>
                                {branchTask.total_count > 0 && (
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
                                                width: `${Math.round((branchTask.completed_count / branchTask.total_count) * 100)}%` as any,
                                            }}
                                        />
                                    </YStack>
                                )}
                            </XStack>

                            {/* Actions */}
                            <XStack gap="$3" paddingTop="$2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onPress={() => {
                                        onUnbranch(branchTask.id, todo.id);
                                        onClose();
                                    }}
                                >
                                    <XStack alignItems="center" gap="$1.5">
                                        <Unlink size={14} color={colors.primary} />
                                        <AppText size="sm" weight="medium" color={colors.primary}>Unbranch</AppText>
                                    </XStack>
                                </Button>

                                <Button
                                    size="sm"
                                    onPress={() => {
                                        onGoToBranch(branchTask.id);
                                        onClose();
                                    }}
                                >
                                    <XStack alignItems="center" gap="$1.5">
                                        <ArrowRight size={14} color="white" />
                                        <AppText size="sm" weight="medium" color="white">Go to Branch</AppText>
                                    </XStack>
                                </Button>
                            </XStack>
                        </YStack>
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
    },
});
