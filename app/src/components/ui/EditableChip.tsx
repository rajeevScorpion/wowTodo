import { useState, useEffect, useRef } from 'react';
import { Pressable, TextInput, StyleSheet } from 'react-native';
import { XStack, View } from 'tamagui';
import { AppText } from './AppText';
import { Edit2, Trash2, Check, X } from 'lucide-react-native';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface EditableChipProps {
    id: string;
    name: string;
    isEditing: boolean;
    onEdit: (id: string) => void;
    onSave: (id: string, newName: string) => void;
    onCancel: () => void;
    onDelete: (id: string, name: string) => void;
    isPending?: boolean;
}

export function EditableChip({
    id,
    name,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    isPending = false,
}: EditableChipProps) {
    const [editedName, setEditedName] = useState(name);
    const [inputWidth, setInputWidth] = useState(80);
    const inputRef = useRef<TextInput>(null);
    const colors = useSemanticColors();

    useEffect(() => {
        setEditedName(name);
    }, [name]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        const trimmedName = editedName.trim();
        if (trimmedName && trimmedName !== name) {
            onSave(id, trimmedName);
        } else {
            onCancel();
        }
    };

    const handleKeyPress = (key: string) => {
        if (key === 'Enter') {
            handleSave();
        } else if (key === 'Escape') {
            onCancel();
        }
    };

    if (isEditing) {
        return (
            <XStack
                backgroundColor={colors.primaryHover}
                borderRadius="$3"
                paddingHorizontal="$3"
                paddingVertical="$2"
                gap="$2"
                alignItems="center"
                borderWidth={1}
                borderColor={colors.primary}
                flexShrink={0}
                maxWidth="90%"
            >
                <TextInput
                    ref={inputRef}
                    value={editedName}
                    onChangeText={setEditedName}
                    onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key)}
                    onSubmitEditing={handleSave}
                    onContentSizeChange={(e) => {
                        const width = e.nativeEvent.contentSize.width;
                        setInputWidth(Math.max(80, Math.min(width + 16, 250)));
                    }}
                    style={[styles.input, { color: colors.color, width: inputWidth }]}
                    placeholder="Group name"
                    placeholderTextColor={colors.placeholderColor}
                    editable={!isPending}
                />
                <Pressable
                    onPress={handleSave}
                    disabled={isPending || !editedName.trim()}
                    style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.iconButtonPressed,
                        (!editedName.trim() || isPending) && styles.iconButtonDisabled,
                    ]}
                >
                    <Check size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                    onPress={onCancel}
                    disabled={isPending}
                    style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.iconButtonPressed,
                        isPending && styles.iconButtonDisabled,
                    ]}
                >
                    <X size={16} color={colors.secondary} />
                </Pressable>
            </XStack>
        );
    }

    return (
        <XStack
            backgroundColor={colors.cardBackground}
            borderRadius="$3"
            paddingHorizontal="$3"
            paddingVertical="$2"
            gap="$2"
            alignItems="center"
            borderWidth={1}
            borderColor={colors.borderColor}
        >
            <View
                width={6}
                height={6}
                borderRadius={3}
                backgroundColor={colors.primary}
            />
            <AppText size="sm" weight="medium" color={colors.color}>
                {name}
            </AppText>
            <Pressable
                onPress={() => onEdit(id)}
                disabled={isPending}
                style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.iconButtonPressed,
                    isPending && styles.iconButtonDisabled,
                ]}
            >
                <Edit2 size={14} color={colors.muted} />
            </Pressable>
            <Pressable
                onPress={() => onDelete(id, name)}
                disabled={isPending}
                style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.iconButtonPressed,
                    isPending && styles.iconButtonDisabled,
                ]}
            >
                <Trash2 size={14} color={colors.error} />
            </Pressable>
        </XStack>
    );
}

const styles = StyleSheet.create({
    input: {
        fontSize: 14,
        minWidth: 80,
        maxWidth: 250,
        padding: 0,
    },
    iconButton: {
        padding: 4,
        borderRadius: 4,
    },
    iconButtonPressed: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    iconButtonDisabled: {
        opacity: 0.4,
    },
});
