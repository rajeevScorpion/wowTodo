import { useState } from 'react';
import { Modal, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { AppText } from './ui/AppText';
import { Input } from './ui/Input';
import { useSemanticColors } from '../design-system/useSemanticColors';

/**
 * Irreversible-action confirmation for deleting an account (defect D1).
 *
 * `ConfirmDialog` is used everywhere else, but a single tap is the wrong gate for
 * the one action in the app that cannot be undone and takes every task, todo,
 * group and share with it. Typing the word forces the user to read what they are
 * agreeing to, and makes a mis-tap on a destructive button harmless.
 *
 * Errors render inside the dialog rather than as an `Alert`, so a failure leaves
 * the user exactly where they were with the confirmation still typed.
 */

const CONFIRM_WORD = 'DELETE';

const CONSEQUENCES = [
    'All your tasks, todos and groups',
    'Your profile, reminders and notifications',
    'Tasks you have shared — the people you shared them with will lose access',
];

interface DeleteAccountDialogProps {
    visible: boolean;
    email?: string | null;
    isDeleting: boolean;
    error: string | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteAccountDialog({
    visible,
    email,
    isDeleting,
    error,
    onConfirm,
    onCancel,
}: DeleteAccountDialogProps) {
    const colors = useSemanticColors();
    const [typed, setTyped] = useState('');

    const canConfirm = typed.trim().toUpperCase() === CONFIRM_WORD && !isDeleting;

    const close = () => {
        if (isDeleting) return;
        setTyped('');
        onCancel();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <Pressable style={styles.backdrop} onPress={close}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <YStack
                        backgroundColor="$neoSurface"
                        borderRadius={20}
                        padding="$5"
                        marginHorizontal="$6"
                        gap="$3"
                        borderWidth={1}
                        borderColor="$hairline"
                        shadowColor="#000"
                        shadowOpacity={0.12}
                        shadowRadius={24}
                        shadowOffset={{ width: 0, height: 8 }}
                        minWidth={280}
                        maxWidth={400}
                    >
                        <AppText size="xl" weight="semibold">Delete account</AppText>

                        <AppText variant="secondary" size="md">
                            This permanently deletes {email ? email : 'your account'} and cannot
                            be undone. You will lose:
                        </AppText>

                        <YStack gap="$1.5" paddingLeft="$2">
                            {CONSEQUENCES.map((line) => (
                                <XStack key={line} gap="$2" alignItems="flex-start">
                                    <AppText variant="secondary" size="sm">•</AppText>
                                    <AppText variant="secondary" size="sm" flex={1}>{line}</AppText>
                                </XStack>
                            ))}
                        </YStack>

                        <AppText variant="secondary" size="md" paddingTop="$2">
                            Type <AppText weight="semibold">{CONFIRM_WORD}</AppText> to confirm.
                        </AppText>

                        {/* No placeholder. `DELETE` as placeholder text reads as if
                            the field is already filled in, so the disabled confirm
                            button looks broken rather than waiting on you. The line
                            above already says exactly what to type. */}
                        <Input
                            value={typed}
                            onChangeText={setTyped}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            editable={!isDeleting}
                        />

                        {error && (
                            <AppText size="sm" weight="medium" variant="error">{error}</AppText>
                        )}

                        <XStack gap="$3" justifyContent="flex-end" paddingTop="$2">
                            <Pressable
                                onPress={close}
                                disabled={isDeleting}
                                style={({ pressed }) => [
                                    styles.button,
                                    {
                                        borderWidth: 1,
                                        borderColor: colors.borderColor,
                                        backgroundColor: pressed ? colors.cardBackground : 'transparent',
                                    },
                                    isDeleting && styles.buttonDisabled,
                                ]}
                            >
                                <AppText size="md" weight="medium">Cancel</AppText>
                            </Pressable>

                            <Pressable
                                onPress={onConfirm}
                                disabled={!canConfirm}
                                style={[
                                    styles.button,
                                    { backgroundColor: colors.error },
                                    !canConfirm && styles.buttonDisabled,
                                ]}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <AppText size="md" weight="medium" color="white">
                                        Delete account
                                    </AppText>
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
