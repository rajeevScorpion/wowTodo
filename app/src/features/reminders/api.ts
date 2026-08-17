import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    ReminderSettings,
    ReminderSettingsRow,
    ScheduledReminder,
    rowToReminderSettings,
    reminderSettingsToRow,
} from '../../types';
import { useAuth } from '../../providers/AuthProvider';
import { cacheReminderSettings } from '../../services/reminders/settingsCache';

export const reminderKeys = {
    settings: ['reminder-settings'] as const,
    scheduled: (todoId: string) => ['scheduled-reminders', todoId] as const,
    allScheduled: ['scheduled-reminders'] as const,
};

/**
 * Fetch all reminder settings (global + per-group overrides) for the current user.
 */
export const useReminderSettings = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: reminderKeys.settings,
        queryFn: async (): Promise<ReminderSettings[]> => {
            const { data, error } = await supabase
                .from('reminder_settings')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const settings = (data as ReminderSettingsRow[]).map(rowToReminderSettings);

            // Cache for offline use
            if (user) {
                cacheReminderSettings(user.id, settings);
            }

            return settings;
        },
        enabled: !!user,
    });
};

/**
 * Get the global default settings from the fetched settings array.
 */
export function getGlobalSettings(settings: ReminderSettings[] | undefined): ReminderSettings | null {
    return settings?.find(s => s.group_id === null) ?? null;
}

/**
 * Get override settings for a specific group.
 */
export function getGroupOverride(
    settings: ReminderSettings[] | undefined,
    groupId: string,
): ReminderSettings | null {
    return settings?.find(s => s.group_id === groupId) ?? null;
}

/**
 * Upsert (create or update) reminder settings.
 * For global: pass group_id = null
 * For group override: pass the group_id
 */
export const useUpsertReminderSettings = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (settings: ReminderSettings) => {
            const row = reminderSettingsToRow(settings);

            let data: ReminderSettingsRow | null;
            let error: any;

            if (settings.id && settings.id !== 'new') {
                // Existing row — UPDATE by primary key (avoids NULL group_id conflict issue)
                const result = await supabase
                    .from('reminder_settings')
                    .update(row)
                    .eq('id', settings.id)
                    .select()
                    .single();
                data = result.data as ReminderSettingsRow | null;
                error = result.error;
            } else {
                // New row — INSERT, let DB generate the UUID
                const result = await supabase
                    .from('reminder_settings')
                    .insert(row)
                    .select()
                    .single();
                data = result.data as ReminderSettingsRow | null;
                error = result.error;
            }

            if (error) throw error;
            return rowToReminderSettings(data as ReminderSettingsRow);
        },
        onSuccess: async (_, variables) => {
            const updatedData = await queryClient.invalidateQueries({
                queryKey: reminderKeys.settings,
            });

            // Update cache
            if (user) {
                const current = queryClient.getQueryData<ReminderSettings[]>(reminderKeys.settings);
                if (current) {
                    cacheReminderSettings(user.id, current);
                }
            }
        },
    });
};

/**
 * Delete a group-specific reminder override.
 * (Falls back to global defaults for that group's tasks)
 */
export const useDeleteReminderOverride = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (settingsId: string) => {
            const { error } = await supabase
                .from('reminder_settings')
                .delete()
                .eq('id', settingsId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reminderKeys.settings });

            if (user) {
                const current = queryClient.getQueryData<ReminderSettings[]>(reminderKeys.settings);
                if (current) {
                    cacheReminderSettings(user.id, current);
                }
            }
        },
    });
};

/**
 * Fetch scheduled reminders for a specific todo.
 */
export const useScheduledReminders = (todoId: string) => {
    return useQuery({
        queryKey: reminderKeys.scheduled(todoId),
        queryFn: async (): Promise<ScheduledReminder[]> => {
            const { data, error } = await supabase
                .from('scheduled_reminders')
                .select('*')
                .eq('todo_id', todoId)
                .order('fire_at', { ascending: true });

            if (error) throw error;
            return data as ScheduledReminder[];
        },
        enabled: !!todoId,
    });
};

/**
 * Ensure a default global setting exists for the user.
 * Call this on app startup or when settings page loads.
 */
export const useEnsureDefaultSettings = () => {
    const { user } = useAuth();
    const upsert = useUpsertReminderSettings();

    return async (existingSettings: ReminderSettings[]) => {
        if (!user) return;

        const hasGlobal = existingSettings.some(s => s.group_id === null);
        if (hasGlobal) return;

        // Create default global settings: 1 reminder, 15 min before, notification
        await upsert.mutateAsync({
            id: 'new',
            user_id: user.id,
            group_id: null,
            slots: [
                { minutes_before: 15, type: 'notification', enabled: true },
                { minutes_before: 60, type: 'notification', enabled: false },
                { minutes_before: 1440, type: 'notification', enabled: false },
            ],
            created_at: '',
            updated_at: '',
        });
    };
};
