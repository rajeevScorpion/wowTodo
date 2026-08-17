import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { X } from 'lucide-react-native';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface RejectionNoteSheetProps {
    visible: boolean;
    onClose: () => void;
    onReject: (note: string) => void;
    isLoading?: boolean;
}

export function RejectionNoteSheet({
    visible,
    onClose,
    onReject,
    isLoading,
}: RejectionNoteSheetProps) {
    const colors = useSemanticColors();
    const [note, setNote] = useState('');

    const handleReject = () => {
        onReject(note.trim());
        setNote('');
    };

    const handleClose = () => {
        setNote('');
        onClose();
    };

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
                        <AppText weight="semibold" size="md">Decline Share</AppText>
                        <Pressable onPress={handleClose} hitSlop={8}>
                            <X size={20} color={colors.muted} />
                        </Pressable>
                    </XStack>

                    <AppText size="sm" variant="muted" marginBottom="$3">
                        Add an optional note explaining why you're declining.
                    </AppText>

                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="Reason for declining (optional)"
                        placeholderTextColor={colors.muted}
                        multiline
                        numberOfLines={3}
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.neoInset,
                                color: colors.color,
                                borderColor: colors.hairline,
                            },
                        ]}
                    />

                    <XStack gap="$3" marginTop="$4">
                        <Button
                            variant="outline"
                            size="sm"
                            onPress={handleClose}
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onPress={handleReject}
                            loading={isLoading}
                            style={{ flex: 1 }}
                        >
                            Decline
                        </Button>
                    </XStack>
                </Pressable>
            </Pressable>
            </KeyboardAvoidingView>
        </Modal>
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
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
    },
});
