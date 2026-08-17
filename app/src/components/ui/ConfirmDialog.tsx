import { Modal, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { AppText } from './AppText';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'destructive' | 'default';
    showCancel?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function ConfirmDialog({
    visible,
    title,
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    variant = 'default',
    showCancel = true,
    onConfirm,
    onCancel,
    isLoading = false,
}: ConfirmDialogProps) {
    const colors = useSemanticColors();
    const confirmColor = variant === 'destructive' ? colors.error : colors.primary;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <Pressable style={styles.backdrop} onPress={onCancel}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <YStack
                        backgroundColor="$neoSurface"
                        borderRadius={20}
                        padding="$5"
                        marginHorizontal="$6"
                        gap="$4"
                        borderWidth={1}
                        borderColor="$hairline"
                        shadowColor="#000"
                        shadowOpacity={0.12}
                        shadowRadius={24}
                        shadowOffset={{ width: 0, height: 8 }}
                        minWidth={280}
                        maxWidth={400}
                    >
                        <AppText size="xl" weight="semibold">{title}</AppText>
                        <AppText variant="secondary" size="md">{message}</AppText>

                        <XStack gap="$3" justifyContent="flex-end" paddingTop="$2">
                            {showCancel && (
                                <Pressable
                                    onPress={onCancel}
                                    disabled={isLoading}
                                    style={({ pressed }) => [
                                        styles.button,
                                        {
                                            borderWidth: 1,
                                            borderColor: colors.borderColor,
                                            backgroundColor: pressed ? colors.cardBackground : 'transparent',
                                        },
                                        isLoading && styles.buttonDisabled,
                                    ]}
                                >
                                    <AppText size="md" weight="medium">{cancelLabel}</AppText>
                                </Pressable>
                            )}

                            <Pressable
                                onPress={onConfirm}
                                disabled={isLoading}
                                style={({ pressed }) => [
                                    styles.button,
                                    {
                                        backgroundColor: pressed ? colors.primaryHover : confirmColor,
                                        flex: showCancel ? undefined : 1,
                                    },
                                    isLoading && styles.buttonDisabled,
                                ]}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <AppText size="md" weight="medium" color="white">{confirmLabel}</AppText>
                                )}
                            </Pressable>
                        </XStack>
                    </YStack>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
