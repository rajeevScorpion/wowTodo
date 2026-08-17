import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Modal, FlatList } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { ChevronDown } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { useSemanticColors } from '../design-system/useSemanticColors';
import { ReminderSlot, ReminderType } from '../types';

const MINUTES_OPTIONS: { label: string; value: number }[] = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '1 day', value: 1440 },
];

const TYPE_OPTIONS: { label: string; value: ReminderType }[] = [
    { label: 'Notification', value: 'notification' },
    { label: 'Alarm', value: 'alarm' },
    { label: 'Both', value: 'both' },
];

function getMinutesLabel(minutes: number): string {
    return MINUTES_OPTIONS.find(o => o.value === minutes)?.label ?? `${minutes} min`;
}

function getTypeLabel(type: ReminderType): string {
    return TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}

interface ReminderSlotRowProps {
    slot: ReminderSlot;
    index: number;
    onChange: (slot: ReminderSlot) => void;
}

export function ReminderSlotRow({ slot, index, onChange }: ReminderSlotRowProps) {
    const colors = useSemanticColors();
    const [showMinutesPicker, setShowMinutesPicker] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);

    return (
        <>
            <XStack alignItems="center" paddingVertical={6} flex={1} justifyContent="space-between">
                <XStack alignItems="center" gap="$2">
                    <AppText size="xs" variant="muted" style={{ width: 24 }}>
                        {index + 1}.
                    </AppText>

                    {/* Minutes picker */}
                    <Pressable
                        onPress={() => setShowMinutesPicker(true)}
                        style={[styles.dropdown, { borderColor: colors.borderColor, backgroundColor: colors.cardBackground }]}
                    >
                        <AppText size="xs" weight="medium">{getMinutesLabel(slot.minutes_before)}</AppText>
                        <ChevronDown size={12} color={colors.muted} />
                    </Pressable>

                    <AppText size="xs" variant="muted">before</AppText>

                    {/* Type picker */}
                    <Pressable
                        onPress={() => setShowTypePicker(true)}
                        style={[styles.dropdown, { borderColor: colors.borderColor, backgroundColor: colors.cardBackground }]}
                    >
                        <AppText size="xs" weight="medium">{getTypeLabel(slot.type)}</AppText>
                        <ChevronDown size={12} color={colors.muted} />
                    </Pressable>
                </XStack>

                {/* Toggle */}
                <Switch
                    value={slot.enabled}
                    onValueChange={(enabled) => onChange({ ...slot, enabled })}
                    trackColor={{ false: colors.borderColor, true: colors.primary }}
                    style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                />
            </XStack>

            {/* Minutes picker modal */}
            <Modal
                visible={showMinutesPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMinutesPicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowMinutesPicker(false)}
                >
                    <YStack
                        backgroundColor={colors.cardBackground}
                        borderRadius="$3"
                        padding="$2"
                        style={styles.modalContent}
                    >
                        <AppText weight="medium" size="sm" style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                            Remind before
                        </AppText>
                        {MINUTES_OPTIONS.map(option => (
                            <Pressable
                                key={option.value}
                                onPress={() => {
                                    onChange({ ...slot, minutes_before: option.value });
                                    setShowMinutesPicker(false);
                                }}
                                style={[
                                    styles.optionRow,
                                    option.value === slot.minutes_before && { backgroundColor: colors.primary + '20' },
                                ]}
                            >
                                <AppText
                                    size="sm"
                                    weight={option.value === slot.minutes_before ? 'semibold' : 'normal'}
                                >
                                    {option.label}
                                </AppText>
                            </Pressable>
                        ))}
                    </YStack>
                </Pressable>
            </Modal>

            {/* Type picker modal */}
            <Modal
                visible={showTypePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowTypePicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowTypePicker(false)}
                >
                    <YStack
                        backgroundColor={colors.cardBackground}
                        borderRadius="$3"
                        padding="$2"
                        style={styles.modalContent}
                    >
                        <AppText weight="medium" size="sm" style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                            Reminder type
                        </AppText>
                        {TYPE_OPTIONS.map(option => (
                            <Pressable
                                key={option.value}
                                onPress={() => {
                                    onChange({ ...slot, type: option.value });
                                    setShowTypePicker(false);
                                }}
                                style={[
                                    styles.optionRow,
                                    option.value === slot.type && { backgroundColor: colors.primary + '20' },
                                ]}
                            >
                                <AppText
                                    size="sm"
                                    weight={option.value === slot.type ? 'semibold' : 'normal'}
                                >
                                    {option.label}
                                </AppText>
                            </Pressable>
                        ))}
                    </YStack>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: 220,
        maxHeight: 400,
    },
    optionRow: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 6,
    },
});
