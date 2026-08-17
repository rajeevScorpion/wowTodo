import React, { useRef, useState } from 'react';
import { TouchableOpacity, Dimensions, View, TextInput } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Card } from './ui/Card';
import { AppText } from './ui/AppText';
import { PopoutMenu, MenuItem } from './ui/PopoutMenu';
import { Check, GripVertical, MoreHorizontal, Edit, GitBranch, Trash2, Bell, Clock, Unlink } from 'lucide-react-native';
import { Todo } from '../types';
import { useSemanticColors } from '../design-system/useSemanticColors';

interface TodoItemProps {
    todo: Todo;
    onToggle: (id: string, completed: boolean) => void;
    onDelete: (id: string, taskId: string) => void;
    onEdit?: (id: string) => void;
    onSaveEdit?: (id: string, newTitle: string) => void;
    isEditing?: boolean;
    onSetReminder?: (todo: Todo) => void;
    onBranch?: (todoId: string, taskId: string) => void;
    onViewBranch?: (todo: Todo) => void;
    onUnbranch?: (todo: Todo) => void;
    isToggling?: boolean;
    isDeleting?: boolean;
    drag?: () => void;
    isActive?: boolean;
    readOnly?: boolean; // Shared task: only toggle allowed, no edit/delete/branch/reminder
}

function formatDueInfo(dueDate: string | null, dueTime: string | null): string | null {
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

// UPDATE THIS COMPARATOR if TodoItemProps changes
export const TodoItem = React.memo(function TodoItem({ todo, onToggle, onDelete, onEdit, onSaveEdit, isEditing, onSetReminder, onBranch, onViewBranch, onUnbranch, isToggling, isDeleting, drag, isActive, readOnly }: TodoItemProps) {
    const colors = useSemanticColors();
    const menuButtonRef = useRef<View>(null);
    const editInputRef = useRef<TextInput>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState({ x: 0, anchorBottom: 0 });
    const [editValue, setEditValue] = useState(todo.title);

    const dueInfo = formatDueInfo(todo.due_date, todo.due_time);

    const handleMenuPress = () => {
        menuButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
            const screenHeight = Dimensions.get('window').height;
            const bottomDistance = screenHeight - pageY;
            setMenuAnchor({ x: pageX - 160, anchorBottom: bottomDistance + height + 4 });
            setShowMenu(true);
        });
    };

    // Build context menu items based on branch state and permissions
    const menuItems: MenuItem[] = [];

    if (!readOnly) {
        menuItems.push({
            icon: <Edit size={18} color={colors.color} />,
            label: 'Edit',
            onPress: () => onEdit?.(todo.id),
        });
        menuItems.push({
            icon: <Bell size={18} color={colors.primary} />,
            label: 'Reminder',
            onPress: () => onSetReminder?.(todo),
        });

        if (todo.is_branched) {
            menuItems.push({
                icon: <GitBranch size={18} color={colors.primary} />,
                label: 'View Branch',
                onPress: () => onViewBranch?.(todo),
            });
            menuItems.push({
                icon: <Unlink size={18} color={colors.muted} />,
                label: 'Unbranch',
                onPress: () => onUnbranch?.(todo),
            });
        } else {
            menuItems.push({
                icon: <GitBranch size={18} color={colors.muted} />,
                label: 'Branch',
                onPress: () => onBranch?.(todo.id, todo.task_id),
            });
        }

        menuItems.push({
            icon: <Trash2 size={18} color={colors.error} />,
            label: 'Delete',
            onPress: () => onDelete(todo.id, todo.task_id),
        });
    }

    // Checkbox is blocked when todo is branched (completion derived from branch items)
    const isCheckboxBlocked = todo.is_branched;

    return (
        <Card
            marginBottom="$3"
            padding="$4"
            flexDirection="row"
            alignItems="center"
            opacity={isActive ? 0.9 : 1}
            style={isActive ? { transform: [{ scale: 1.03 }] } : undefined}
        >
            {drag && !readOnly && (
                <TouchableOpacity onPressIn={drag} style={{ marginRight: 8, paddingVertical: 4 }}>
                    <GripVertical size={18} color={colors.muted} />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={() => {
                    if (!isCheckboxBlocked) {
                        onToggle(todo.id, !todo.completed);
                    }
                }}
                disabled={isToggling || isCheckboxBlocked}
                style={{
                    height: 24,
                    width: 24,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: todo.completed ? colors.primary : colors.borderColor,
                    backgroundColor: todo.completed ? colors.primary : 'white',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    opacity: isCheckboxBlocked ? 0.6 : 1,
                }}
            >
                {todo.completed && <Check size={14} color="white" />}
            </TouchableOpacity>

            <YStack flex={1} marginRight="$2">
                {isEditing ? (
                    <TextInput
                        ref={editInputRef}
                        value={editValue}
                        onChangeText={setEditValue}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => {
                            const trimmed = editValue.trim();
                            if (trimmed && trimmed !== todo.title) {
                                onSaveEdit?.(todo.id, trimmed);
                            } else {
                                onEdit?.(''); // cancel editing by clearing editingTodoId
                            }
                        }}
                        onBlur={() => {
                            const trimmed = editValue.trim();
                            if (trimmed && trimmed !== todo.title) {
                                onSaveEdit?.(todo.id, trimmed);
                            } else {
                                setEditValue(todo.title);
                                onEdit?.(''); // cancel
                            }
                        }}
                        style={{
                            fontSize: 14,
                            color: colors.color,
                            paddingVertical: 2,
                            paddingHorizontal: 0,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.primary,
                        }}
                    />
                ) : (
                    <AppText
                        color={todo.completed ? colors.muted : colors.color}
                        textDecorationLine={todo.completed ? 'line-through' : 'none'}
                    >
                        {todo.title}
                    </AppText>
                )}
                {dueInfo && (
                    <XStack alignItems="center" gap={4} marginTop={2}>
                        <Clock size={10} color={todo.completed ? colors.muted : colors.primary} />
                        <AppText
                            size="xs"
                            color={todo.completed ? colors.muted : colors.primary}
                        >
                            {dueInfo}
                        </AppText>
                    </XStack>
                )}
            </YStack>

            {/* Branch icon indicator for branched todos */}
            {todo.is_branched && (
                <TouchableOpacity
                    onPress={() => onViewBranch?.(todo)}
                    style={{ marginRight: 4, padding: 4 }}
                >
                    <GitBranch size={14} color={colors.primary} />
                </TouchableOpacity>
            )}

            {/* Bell indicator for todos with due dates */}
            {dueInfo && !todo.completed && (
                <TouchableOpacity
                    onPress={() => onSetReminder?.(todo)}
                    style={{ marginRight: 4, padding: 4 }}
                >
                    <Bell size={14} color={colors.primary} />
                </TouchableOpacity>
            )}

            {!readOnly && (
                <>
                    <View ref={menuButtonRef} collapsable={false}>
                        <TouchableOpacity
                            onPress={handleMenuPress}
                            activeOpacity={0.6}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ height: 32, width: 32, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <MoreHorizontal size={18} color={colors.muted} />
                        </TouchableOpacity>
                    </View>

                    <PopoutMenu
                        visible={showMenu}
                        onClose={() => setShowMenu(false)}
                        items={menuItems}
                        anchorX={menuAnchor.x}
                        anchorBottom={menuAnchor.anchorBottom}
                    />
                </>
            )}
        </Card>
    );
}, (prev, next) => {
    return (
        prev.todo.id === next.todo.id &&
        prev.todo.completed === next.todo.completed &&
        prev.todo.title === next.todo.title &&
        prev.todo.is_branched === next.todo.is_branched &&
        prev.todo.due_date === next.todo.due_date &&
        prev.todo.due_time === next.todo.due_time &&
        prev.isToggling === next.isToggling &&
        prev.isDeleting === next.isDeleting &&
        prev.isEditing === next.isEditing &&
        prev.isActive === next.isActive &&
        prev.readOnly === next.readOnly &&
        // drag presence (defined vs undefined) matters, not reference
        !!prev.drag === !!next.drag
    );
});
