import { useState, useEffect, useCallback } from 'react';
import { Pressable, StyleSheet, Modal, Alert } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Bell, Plus, Trash2, ChevronDown } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { Heading } from './ui/Heading';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Button } from './ui/Button';
import { ReminderSlotRow } from './ReminderSlotRow';
import { useSemanticColors } from '../design-system/useSemanticColors';
import {
    useReminderSettings,
    useUpsertReminderSettings,
    useDeleteReminderOverride,
    useEnsureDefaultSettings,
    getGlobalSettings,
} from '../features/reminders/api';
import { useGroups } from '../features/groups/api';
import { useAuth } from '../providers/AuthProvider';
import { rescheduleAllReminders } from '../services/reminders/scheduler';
import { ReminderSettings, ReminderSlot, TaskGroup } from '../types';

const DEFAULT_SLOTS: ReminderSlot[] = [
    { minutes_before: 15, type: 'notification', enabled: true },
    { minutes_before: 60, type: 'notification', enabled: false },
    { minutes_before: 1440, type: 'notification', enabled: false },
];

export function ReminderSettingsSection() {
    const colors = useSemanticColors();
    const { user } = useAuth();
    const { data: settings, isLoading } = useReminderSettings();
    const { data: groups } = useGroups();
    const upsertSettings = useUpsertReminderSettings();
    const deleteOverride = useDeleteReminderOverride();
    const ensureDefault = useEnsureDefaultSettings();

    const [showGroupPicker, setShowGroupPicker] = useState(false);
    const [deleteDialogOverride, setDeleteDialogOverride] = useState<ReminderSettings | null>(null);
    const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());

    const toggleOverrideExpanded = useCallback((id: string) => {
        setExpandedOverrides(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // Ensure default global settings exist
    useEffect(() => {
        if (settings && !isLoading) {
            ensureDefault(settings);
        }
    }, [settings, isLoading]);

    const globalSettings = settings ? getGlobalSettings(settings) : null;
    const overrides = settings?.filter(s => s.group_id !== null) ?? [];

    // Groups that don't have an override yet
    const availableGroups = groups?.filter(
        g => !overrides.some(o => o.group_id === g.id),
    ) ?? [];

    const handleSlotChange = useCallback(async (
        settingsItem: ReminderSettings,
        slotIndex: number,
        newSlot: ReminderSlot,
    ) => {
        const updatedSlots = [...settingsItem.slots];
        updatedSlots[slotIndex] = newSlot;
        const updated = { ...settingsItem, slots: updatedSlots };

        try {
            await upsertSettings.mutateAsync(updated);

            // Reschedule all reminders with new settings
            if (user && settings) {
                const allUpdated = settings.map(s =>
                    s.id === settingsItem.id ? updated : s,
                );
                rescheduleAllReminders(user.id, allUpdated).catch(console.warn);
            }
        } catch (error: any) {
            Alert.alert('Failed to save', error.message);
        }
    }, [upsertSettings, user, settings]);

    const handleAddOverride = useCallback(async (group: TaskGroup) => {
        if (!user) return;
        setShowGroupPicker(false);

        try {
            await upsertSettings.mutateAsync({
                id: 'new',
                user_id: user.id,
                group_id: group.id,
                slots: [...DEFAULT_SLOTS],
                created_at: '',
                updated_at: '',
            });
        } catch (error: any) {
            Alert.alert('Failed to create override', error.message);
        }
    }, [user, upsertSettings]);

    const handleDeleteOverride = useCallback((settingsItem: ReminderSettings) => {
        setDeleteDialogOverride(settingsItem);
    }, []);

    const handleConfirmDeleteOverride = useCallback(async () => {
        if (!deleteDialogOverride) return;
        try {
            await deleteOverride.mutateAsync(deleteDialogOverride.id);

            if (user && settings) {
                const remaining = settings.filter(s => s.id !== deleteDialogOverride.id);
                rescheduleAllReminders(user.id, remaining).catch(console.warn);
            }
        } catch (error: any) {
            Alert.alert('Failed to remove', error.message);
        } finally {
            setDeleteDialogOverride(null);
        }
    }, [deleteDialogOverride, deleteOverride, user, settings]);

    const getGroupName = (groupId: string | null): string => {
        if (!groupId) return 'Global';
        return groups?.find(g => g.id === groupId)?.name ?? 'Unknown';
    };

    if (isLoading) {
        return (
            <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                    <Bell size={20} color={colors.primary} />
                    <Heading level={3}>Reminders</Heading>
                </XStack>
                <AppText variant="muted" size="sm">Loading...</AppText>
            </YStack>
        );
    }

    return (
        <YStack gap="$3">
            <XStack alignItems="center" gap="$2">
                <Bell size={20} color={colors.primary} />
                <Heading level={3}>Reminders</Heading>
            </XStack>

            {/* Global Defaults */}
            <YStack
                gap="$1"
                padding="$3"
                borderRadius="$3"
                backgroundColor={colors.cardBackground}
                borderWidth={1}
                borderColor={colors.borderColor}
            >
                <AppText weight="semibold" size="md">Global Defaults</AppText>
                <AppText variant="muted" size="xs">Applied to all tasks unless overridden by group</AppText>

                {globalSettings ? (
                    globalSettings.slots.map((slot, i) => (
                        <ReminderSlotRow
                            key={i}
                            slot={slot}
                            index={i}
                            onChange={(newSlot) => handleSlotChange(globalSettings, i, newSlot)}
                        />
                    ))
                ) : (
                    <AppText variant="muted" size="xs">Setting up defaults...</AppText>
                )}
            </YStack>

            {/* Group Overrides */}
            {overrides.length > 0 && (
                <YStack gap="$2">
                    <AppText weight="semibold" size="md">Group Overrides</AppText>
                    <AppText variant="muted" size="xs">
                        Custom reminder settings for specific groups
                    </AppText>

                    {overrides.map(override => {
                        const isExpanded = expandedOverrides.has(override.id);
                        return (
                            <YStack
                                key={override.id}
                                borderRadius="$3"
                                backgroundColor={colors.cardBackground}
                                borderWidth={1}
                                borderColor={colors.borderColor}
                                overflow="hidden"
                            >
                                <Pressable onPress={() => toggleOverrideExpanded(override.id)}>
                                    <XStack
                                        alignItems="center"
                                        justifyContent="space-between"
                                        padding="$3"
                                    >
                                        <XStack alignItems="center" gap="$2">
                                            <ChevronDown
                                                size={14}
                                                color={colors.muted}
                                                style={{
                                                    transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }],
                                                }}
                                            />
                                            <AppText weight="medium" size="sm" color={colors.primary}>
                                                {getGroupName(override.group_id)}
                                            </AppText>
                                        </XStack>
                                        <Pressable
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleDeleteOverride(override);
                                            }}
                                            hitSlop={8}
                                        >
                                            <Trash2 size={16} color={colors.error} />
                                        </Pressable>
                                    </XStack>
                                </Pressable>

                                {isExpanded && (
                                    <YStack gap="$1" paddingHorizontal="$3" paddingBottom="$3">
                                        {override.slots.map((slot, i) => (
                                            <ReminderSlotRow
                                                key={i}
                                                slot={slot}
                                                index={i}
                                                onChange={(newSlot) => handleSlotChange(override, i, newSlot)}
                                            />
                                        ))}
                                    </YStack>
                                )}
                            </YStack>
                        );
                    })}
                </YStack>
            )}

            {/* Add Group Override */}
            {availableGroups.length > 0 && (
                <Pressable
                    onPress={() => setShowGroupPicker(true)}
                    style={[styles.addButton, { borderColor: colors.borderColor }]}
                >
                    <XStack alignItems="center" gap={6}>
                        <Plus size={14} color={colors.primary} />
                        <AppText size="sm" weight="medium" color={colors.primary}>
                            Add Group Override
                        </AppText>
                    </XStack>
                </Pressable>
            )}

            {/* Group picker modal */}
            <Modal
                visible={showGroupPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowGroupPicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowGroupPicker(false)}
                >
                    <YStack
                        backgroundColor={colors.cardBackground}
                        borderRadius="$3"
                        padding="$3"
                        style={styles.modalContent}
                    >
                        <AppText weight="medium" size="md" style={{ marginBottom: 8 }}>
                            Select a group
                        </AppText>
                        {availableGroups.map(group => (
                            <Pressable
                                key={group.id}
                                onPress={() => handleAddOverride(group)}
                                style={styles.groupOption}
                            >
                                <AppText size="sm">{group.name}</AppText>
                            </Pressable>
                        ))}
                        <Pressable
                            onPress={() => setShowGroupPicker(false)}
                            style={[styles.groupOption, { marginTop: 8 }]}
                        >
                            <AppText size="sm" variant="muted">Cancel</AppText>
                        </Pressable>
                    </YStack>
                </Pressable>
            </Modal>

            <ConfirmDialog
                visible={deleteDialogOverride !== null}
                title="Remove Override"
                message="Tasks in this group will use global default reminders."
                confirmLabel="Remove"
                variant="destructive"
                onConfirm={handleConfirmDeleteOverride}
                onCancel={() => setDeleteDialogOverride(null)}
                isLoading={deleteOverride.isPending}
            />
        </YStack>
    );
}

const styles = StyleSheet.create({
    addButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: 260,
        maxHeight: 400,
    },
    groupOption: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 6,
    },
});
