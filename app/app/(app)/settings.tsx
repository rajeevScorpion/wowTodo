import { useState } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, View } from 'tamagui';
import { Screen } from '../../src/components/ui/Screen';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { EditableChip } from '../../src/components/ui/EditableChip';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { DeleteAccountDialog } from '../../src/components/DeleteAccountDialog';
import { LogOut, Plus, FolderOpen, Palette, Smartphone, Sun, Moon, Check, Trash2 } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { deleteAccount } from '../../src/services/account/deleteAccount';
import { useAuth } from '../../src/providers/AuthProvider';
import { useGroups, useCreateGroup, useDeleteGroup, useRenameGroup } from '../../src/features/groups/api';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { ReminderSettingsSection } from '../../src/components/ReminderSettingsSection';
import { useTheme } from '../_layout';

const THEME_OPTIONS = [
    { value: 'system' as const, label: 'System', icon: Smartphone },
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
];

export default function SettingsScreen() {
    const { user } = useAuth();
    const { data: groups, isLoading: groupsLoading } = useGroups();
    const createGroup = useCreateGroup();
    const deleteGroup = useDeleteGroup();
    const renameGroup = useRenameGroup();
    const colors = useSemanticColors();
    const { preference, setPreference } = useTheme();

    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [deleteDialogGroup, setDeleteDialogGroup] = useState<{ id: string; name: string } | null>(null);
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

    const onSignOut = async () => {
        await supabase.auth.signOut();
    };

    /**
     * On success there is deliberately no confirmation to dismiss: `deleteAccount`
     * signs out, which unmounts this screen and returns to login. Showing a
     * success dialog on a screen that is being torn down would leave a modal
     * stranded over the login page.
     */
    const onDeleteAccount = async () => {
        setDeletingAccount(true);
        setDeleteAccountError(null);
        try {
            await deleteAccount();
        } catch (error: any) {
            setDeleteAccountError(error?.message || 'Could not delete the account. Please try again.');
            setDeletingAccount(false);
        }
    };

    const handleCreateGroup = () => {
        if (!newGroupName.trim() || !user) return;
        createGroup.mutate(
            { user_id: user.id, name: newGroupName.trim() },
            { onSuccess: () => setNewGroupName('') },
        );
    };

    const handleDeleteGroup = (groupId: string, groupName: string) => {
        setDeleteDialogGroup({ id: groupId, name: groupName });
    };

    const handleEditGroup = (groupId: string) => {
        setEditingGroupId(groupId);
    };

    const handleSaveGroup = (groupId: string, newName: string) => {
        renameGroup.mutate(
            { id: groupId, name: newName },
            {
                onSuccess: () => {
                    setEditingGroupId(null);
                },
                onError: () => {
                    Alert.alert('Error', 'Failed to rename group. Please try again.');
                },
            },
        );
    };

    const handleCancelEdit = () => {
        setEditingGroupId(null);
    };

    return (
        <Screen edges={['left', 'right']} scroll>
            <YStack flex={1} padding="$2" gap="$6">
                {/* Theme section */}
                <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                        <Palette size={20} color={colors.primary} />
                        <Heading level={3}>Appearance</Heading>
                    </XStack>
                    <AppText variant="muted" size="sm">
                        Choose your preferred theme
                    </AppText>
                    <XStack gap="$2">
                        {THEME_OPTIONS.map(opt => {
                            const isActive = preference === opt.value;
                            const Icon = opt.icon;
                            return (
                                <Pressable
                                    key={opt.value}
                                    onPress={() => setPreference(opt.value)}
                                    style={[
                                        themeStyles.option,
                                        {
                                            backgroundColor: isActive ? colors.neoAccentGold : colors.neoSurface,
                                            borderColor: isActive ? colors.neoAccentGold : colors.hairline,
                                        },
                                    ]}
                                >
                                    <Icon size={18} color={isActive ? 'white' : colors.muted} />
                                    <AppText
                                        size="sm"
                                        weight="medium"
                                        color={isActive ? 'white' : colors.color}
                                    >
                                        {opt.label}
                                    </AppText>
                                    {isActive && <Check size={14} color="white" />}
                                </Pressable>
                            );
                        })}
                    </XStack>
                </YStack>

                {/* Reminders section */}
                <ReminderSettingsSection />

                {/* Groups section */}
                <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                        <FolderOpen size={20} color={colors.primary} />
                        <Heading level={3}>Task Groups</Heading>
                    </XStack>
                    <AppText variant="muted" size="sm">
                        Groups help organize your tasks. AI will automatically assign tasks to matching groups.
                    </AppText>

                    {/* Group list */}
                    {groupsLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : groups && groups.length > 0 ? (
                        <XStack flexWrap="wrap" gap="$2">
                            {groups.map(group => (
                                <EditableChip
                                    key={group.id}
                                    id={group.id}
                                    name={group.name}
                                    isEditing={editingGroupId === group.id}
                                    onEdit={handleEditGroup}
                                    onSave={handleSaveGroup}
                                    onCancel={handleCancelEdit}
                                    onDelete={handleDeleteGroup}
                                    isPending={deleteGroup.isPending || renameGroup.isPending}
                                />
                            ))}
                        </XStack>
                    ) : (
                        <AppText variant="muted" size="sm">
                            No groups yet. Create one below or let AI suggest groups when you create tasks.
                        </AppText>
                    )}

                    {/* Add group input */}
                    <XStack gap="$2" alignItems="flex-end">
                        <YStack flex={1}>
                            <Input
                                value={newGroupName}
                                onChangeText={setNewGroupName}
                                placeholder="New group name (1-2 words)"
                                onSubmitEditing={handleCreateGroup}
                            />
                        </YStack>
                        <Button
                            onPress={handleCreateGroup}
                            disabled={!newGroupName.trim() || createGroup.isPending}
                            size="md"
                            style={{ paddingHorizontal: 12 }}
                        >
                            {createGroup.isPending ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Plus color="white" size={20} />
                            )}
                        </Button>
                    </XStack>
                </YStack>

                {/* Sign out */}
                <YStack>
                    <Button variant="destructive" onPress={onSignOut} size="md" fullWidth>
                        <LogOut size={18} color="white" />
                        <AppText weight="medium" color={'white'}>Sign Out</AppText>
                    </Button>
                </YStack>

                {/* Account deletion (D1 — required by Google Play). Kept visually
                    quieter than Sign Out and placed last, so the destructive
                    option is never the one reached by accident. */}
                <YStack gap="$2" marginBottom="$8">
                    <XStack alignItems="center" gap="$2">
                        <Trash2 size={20} color={colors.error} />
                        <Heading level={3}>Delete account</Heading>
                    </XStack>
                    <AppText variant="muted" size="sm">
                        Permanently delete your account and all your data. This cannot be undone.
                    </AppText>
                    <Button
                        variant="outline"
                        onPress={() => {
                            setDeleteAccountError(null);
                            setDeleteAccountOpen(true);
                        }}
                        size="md"
                        fullWidth
                    >
                        <AppText weight="medium" color={colors.error}>Delete my account</AppText>
                    </Button>
                </YStack>
            </YStack>

            <ConfirmDialog
                visible={deleteDialogGroup !== null}
                title="Delete Group"
                message={`Delete "${deleteDialogGroup?.name ?? 'this group'}"? Tasks in this group will be ungrouped.`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => {
                    if (deleteDialogGroup) {
                        deleteGroup.mutate(deleteDialogGroup.id, {
                            onSettled: () => setDeleteDialogGroup(null),
                        });
                    }
                }}
                onCancel={() => setDeleteDialogGroup(null)}
                isLoading={deleteGroup.isPending}
            />

            <DeleteAccountDialog
                visible={deleteAccountOpen}
                email={user?.email}
                isDeleting={deletingAccount}
                error={deleteAccountError}
                onConfirm={onDeleteAccount}
                onCancel={() => setDeleteAccountOpen(false)}
            />
        </Screen>
    );
}

const themeStyles = StyleSheet.create({
    option: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
});
