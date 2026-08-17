import { useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { YStack, XStack } from 'tamagui';
import { Calendar, Clock, X, Check } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { useSemanticColors } from '../design-system/useSemanticColors';
import { Todo, Task } from '../types';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '../features/tasks/api';
import { cancelRemindersForTodo, scheduleRemindersForTodo } from '../services/reminders/scheduler';
import { useReminderSettings } from '../features/reminders/api';

interface ReminderEditSheetProps {
    visible: boolean;
    onClose: () => void;
    todo: Todo;
    task: Task;
}

/** Parse "YYYY-MM-DD" into a Date (local timezone) */
function parseDateString(str: string | null): Date | null {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

/** Parse "HH:MM" into a Date with today's date (local timezone) */
function parseTimeString(str: string | null): Date | null {
    if (!str) return null;
    const [h, m] = str.split(':').map(Number);
    if (h == null || m == null) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

/** Format a Date to "YYYY-MM-DD" */
function formatDateToString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Format a Date to "HH:MM" (24h) */
function formatTimeToString(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

/** Display-friendly date: "26 Feb, 2026" */
function formatDateDisplay(date: Date): string {
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Display-friendly time (24h): "19:30" */
function formatTimeDisplay(date: Date): string {
    return formatTimeToString(date);
}

export function ReminderEditSheet({ visible, onClose, todo, task }: ReminderEditSheetProps) {
    const colors = useSemanticColors();
    const queryClient = useQueryClient();
    const { data: reminderSettings } = useReminderSettings();

    const [dateValue, setDateValue] = useState<Date | null>(null);
    const [timeValue, setTimeValue] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Android-only: control picker dialog visibility
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        if (visible) {
            setDateValue(parseDateString(todo.due_date));
            setTimeValue(parseTimeString(todo.due_time));
            setShowDatePicker(false);
            setShowTimePicker(false);
        }
    }, [visible, todo]);

    const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDateValue(selectedDate);
        }
    };

    const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
        if (selectedDate) {
            setTimeValue(selectedDate);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newDueDate = dateValue ? formatDateToString(dateValue) : null;
            const newDueTime = timeValue ? formatTimeToString(timeValue) : null;

            const { error } = await supabase
                .from('todos')
                .update({
                    due_date: newDueDate,
                    due_time: newDueTime,
                })
                .eq('id', todo.id);

            if (error) throw error;

            await cancelRemindersForTodo(todo.id);

            if (newDueDate && reminderSettings && reminderSettings.length > 0) {
                const updatedTodo = { ...todo, due_date: newDueDate, due_time: newDueTime };
                await scheduleRemindersForTodo(updatedTodo, task, reminderSettings);
            }

            queryClient.invalidateQueries({ queryKey: taskKeys.todos(todo.task_id) });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });

            onClose();
        } catch (error: any) {
            console.error('Failed to update reminder:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('todos')
                .update({ due_date: null, due_time: null })
                .eq('id', todo.id);

            if (error) throw error;

            await cancelRemindersForTodo(todo.id);

            queryClient.invalidateQueries({ queryKey: taskKeys.todos(todo.task_id) });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });

            onClose();
        } catch (error: any) {
            console.error('Failed to clear reminder:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
                    <YStack gap="$3" padding="$4">
                        {/* Header */}
                        <XStack alignItems="center" justifyContent="space-between">
                            <AppText weight="semibold" size="md">Set Reminder</AppText>
                            <Pressable onPress={onClose}>
                                <X size={20} color={colors.muted} />
                            </Pressable>
                        </XStack>

                        <AppText size="sm" variant="muted" numberOfLines={2}>
                            {todo.title}
                        </AppText>

                        {/* Date picker */}
                        <YStack gap="$1">
                            <XStack alignItems="center" gap={6}>
                                <Calendar size={16} color={colors.primary} />
                                <AppText size="sm" weight="medium">Date</AppText>
                            </XStack>

                            {Platform.OS === 'android' ? (
                                <>
                                    <Pressable
                                        onPress={() => setShowDatePicker(true)}
                                        style={[
                                            styles.pickerButton,
                                            {
                                                borderColor: colors.borderColor,
                                                backgroundColor: colors.cardBackground,
                                            },
                                        ]}
                                    >
                                        <AppText
                                            size="sm"
                                            color={dateValue ? colors.color : colors.placeholderColor}
                                        >
                                            {dateValue ? formatDateDisplay(dateValue) : 'Tap to select date'}
                                        </AppText>
                                    </Pressable>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={dateValue ?? new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={handleDateChange}
                                        />
                                    )}
                                </>
                            ) : (
                                <DateTimePicker
                                    value={dateValue ?? new Date()}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    style={styles.iosPicker}
                                />
                            )}
                        </YStack>

                        {/* Time picker */}
                        <YStack gap="$1">
                            <XStack alignItems="center" gap={6}>
                                <Clock size={16} color={colors.primary} />
                                <AppText size="sm" weight="medium">Time</AppText>
                            </XStack>

                            {Platform.OS === 'android' ? (
                                <>
                                    <Pressable
                                        onPress={() => setShowTimePicker(true)}
                                        style={[
                                            styles.pickerButton,
                                            {
                                                borderColor: colors.borderColor,
                                                backgroundColor: colors.cardBackground,
                                            },
                                        ]}
                                    >
                                        <AppText
                                            size="sm"
                                            color={timeValue ? colors.color : colors.placeholderColor}
                                        >
                                            {timeValue ? formatTimeDisplay(timeValue) : 'Tap to select time'}
                                        </AppText>
                                    </Pressable>
                                    {showTimePicker && (
                                        <DateTimePicker
                                            value={timeValue ?? new Date()}
                                            mode="time"
                                            is24Hour={true}
                                            display="default"
                                            onChange={handleTimeChange}
                                        />
                                    )}
                                </>
                            ) : (
                                <DateTimePicker
                                    value={timeValue ?? new Date()}
                                    mode="time"
                                    is24Hour={true}
                                    display="spinner"
                                    onChange={handleTimeChange}
                                    style={styles.iosPicker}
                                />
                            )}
                        </YStack>

                        <AppText size="xs" variant="muted">
                            Reminders will be scheduled based on your global/group settings.
                        </AppText>

                        {/* Actions */}
                        <XStack gap="$2" justifyContent="space-between" paddingTop="$2">
                            {(todo.due_date || todo.due_time) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onPress={handleClear}
                                    disabled={isSaving}
                                >
                                    <AppText size="sm" color={colors.error}>Clear</AppText>
                                </Button>
                            )}
                            <XStack flex={1} justifyContent="flex-end" gap="$2">
                                <Button variant="outline" size="sm" onPress={onClose} disabled={isSaving}>
                                    <AppText size="sm">Cancel</AppText>
                                </Button>
                                <Button size="sm" onPress={handleSave} disabled={isSaving}>
                                    <XStack alignItems="center" gap={4}>
                                        <Check size={14} color="white" />
                                        <AppText size="sm" color="white" weight="medium">Save</AppText>
                                    </XStack>
                                </Button>
                            </XStack>
                        </XStack>
                    </YStack>
                </Pressable>
            </Pressable>
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
        minHeight: 300,
    },
    pickerButton: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    iosPicker: {
        height: 120,
    },
});
