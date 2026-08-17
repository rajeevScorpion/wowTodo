import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../contexts/ToastContext';
import { shareKeys } from './api';
import { taskKeys } from '../tasks/api';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribes to Supabase Realtime channels for sharing-related updates.
 * Must be mounted inside both AuthProvider and ToastProvider.
 *
 * Channels:
 * 1. shares — new/updated shares for the current user
 * 2. in_app_notifications — new notifications for the current user
 * 3. todos — updates to todos on shared tasks (progress tracking)
 */
export function useRealtimeSharing() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const channelsRef = useRef<RealtimeChannel[]>([]);

    useEffect(() => {
        if (!user) return;

        // 1. Shares where I am the recipient (new incoming shares)
        const sharesRecipientChannel = supabase
            .channel('shares-recipient')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'shares',
                    filter: `recipient_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: shareKeys.received });
                    showToast('You received a new shared task', 'info');
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'shares',
                    filter: `recipient_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: shareKeys.received });
                }
            )
            .subscribe();

        // 2. Shares where I am the owner (accept/reject/revoke responses)
        const sharesOwnerChannel = supabase
            .channel('shares-owner')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'shares',
                    filter: `owner_id=eq.${user.id}`,
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: shareKeys.sent });
                    const newStatus = payload.new?.status;
                    if (newStatus === 'accepted') {
                        showToast('Your shared task was accepted', 'success');
                    } else if (newStatus === 'rejected') {
                        showToast('Your shared task was declined', 'warning');
                    }
                }
            )
            .subscribe();

        // 3. Notifications for me
        const notificationsChannel = supabase
            .channel('notifications-for-me')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'in_app_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: shareKeys.notifications });
                    queryClient.invalidateQueries({ queryKey: shareKeys.unreadCount });
                }
            )
            .subscribe();

        // 4. Todo updates on any task (for shared task progress tracking)
        const todosChannel = supabase
            .channel('shared-todos-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'todos',
                },
                (payload) => {
                    // Invalidate the specific task's todos and the overall task list.
                    // Realtime payloads are loosely typed by supabase-js (the row
                    // shape isn't known at subscribe time), so narrow explicitly.
                    const row = (payload.new ?? payload.old) as { task_id?: string } | null;
                    const taskId = row?.task_id;
                    if (taskId) {
                        queryClient.invalidateQueries({ queryKey: taskKeys.todos(taskId) });
                    }
                    queryClient.invalidateQueries({ queryKey: taskKeys.all });
                    // Also refresh sharing data for progress bars
                    queryClient.invalidateQueries({ queryKey: shareKeys.received });
                    queryClient.invalidateQueries({ queryKey: shareKeys.sent });
                }
            )
            .subscribe();

        channelsRef.current = [
            sharesRecipientChannel,
            sharesOwnerChannel,
            notificationsChannel,
            todosChannel,
        ];

        return () => {
            for (const channel of channelsRef.current) {
                supabase.removeChannel(channel);
            }
            channelsRef.current = [];
        };
    }, [user, queryClient, showToast]);
}
