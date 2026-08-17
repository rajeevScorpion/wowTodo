import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { Share, InAppNotification, UserSearchResult, Database } from '../../types';
import { taskKeys } from '../tasks/api';

type ShareInsert = Database['public']['Tables']['shares']['Insert'];

// Centralized query keys
export const shareKeys = {
    all: ['shares'] as const,
    received: ['shares', 'received'] as const,
    sent: ['shares', 'sent'] as const,
    forTask: (taskId: string) => ['shares', 'task', taskId] as const,
    notifications: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
};

// ─── Share with enriched profile data ───────────────────────

export type EnrichedShare = Share & {
    task_title: string;
    task_description: string | null;
    counterpart_name: string | null;
    counterpart_avatar: string | null;
    counterpart_email: string | null;
    total_count: number;
    completed_count: number;
};

// ─── Received shares (For Me tab) ───────────────────────────

export const useReceivedShares = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: shareKeys.received,
        queryFn: async (): Promise<EnrichedShare[]> => {
            // Fetch shares where I am the recipient
            const { data: shares, error } = await supabase
                .from('shares')
                .select('*')
                .eq('recipient_id', user!.id)
                .in('status', ['pending', 'accepted'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!shares || shares.length === 0) return [];

            // Batch fetch task titles via SECURITY DEFINER function
            // (bypasses RLS so pending shares also return task info)
            const taskIds = [...new Set(shares.map((s) => s.task_id))];
            const { data: tasks } = await supabase.rpc('get_shared_task_info', {
                p_task_ids: taskIds,
            });

            // Batch fetch owner profiles via SECURITY DEFINER function
            // (RLS on user_profiles blocks cross-user reads)
            const ownerIds = [...new Set(shares.map((s) => s.owner_id))];
            const { data: profiles } = await supabase.rpc('get_profiles_by_ids', {
                p_user_ids: ownerIds,
            });

            // For pending shares, we can't fetch todos (RLS blocks until accepted)
            // For accepted shares, batch fetch todo counts
            const acceptedTaskIds = shares
                .filter((s) => s.status === 'accepted')
                .map((s) => s.task_id);

            let todoCounts = new Map<string, { total: number; completed: number }>();
            if (acceptedTaskIds.length > 0) {
                const { data: todos } = await supabase
                    .from('todos')
                    .select('task_id, completed')
                    .in('task_id', acceptedTaskIds);

                if (todos) {
                    for (const todo of todos) {
                        const current = todoCounts.get(todo.task_id) || { total: 0, completed: 0 };
                        current.total++;
                        if (todo.completed) current.completed++;
                        todoCounts.set(todo.task_id, current);
                    }
                }
            }

            // For owner emails, use search_users won't work (different user).
            // We'll use auth metadata from profiles or skip email for now.
            const tasksMap = new Map(tasks?.map((t: any) => [t.task_id, t]) || []);
            const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

            return shares.map((share) => {
                const task = tasksMap.get(share.task_id);
                const profile = profilesMap.get(share.owner_id);
                const counts = todoCounts.get(share.task_id) || { total: 0, completed: 0 };

                return {
                    ...(share as Share),
                    task_title: task?.title || 'Unknown Task',
                    task_description: task?.description || null,
                    counterpart_name: profile?.full_name || null,
                    counterpart_avatar: profile?.avatar_url || null,
                    counterpart_email: null,
                    total_count: counts.total,
                    completed_count: counts.completed,
                };
            });
        },
        enabled: !!user,
    });
};

// ─── Sent shares (Shared tab) ───────────────────────────────

export const useSentShares = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: shareKeys.sent,
        queryFn: async (): Promise<EnrichedShare[]> => {
            const { data: shares, error } = await supabase
                .from('shares')
                .select('*')
                .eq('owner_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!shares || shares.length === 0) return [];

            // Batch fetch task info
            const taskIds = [...new Set(shares.map((s) => s.task_id))];
            const { data: tasks } = await supabase
                .from('tasks')
                .select('id, title, description')
                .in('id', taskIds);

            // Batch fetch recipient profiles via SECURITY DEFINER function
            // recipient_id is nullable in the schema; drop nulls so the RPC gets
            // a clean string[] and we never look up an undefined profile.
            const recipientIds = [
                ...new Set(
                    shares
                        .map((s) => s.recipient_id)
                        .filter((id): id is string => Boolean(id)),
                ),
            ];
            const { data: profiles } = await supabase.rpc('get_profiles_by_ids', {
                p_user_ids: recipientIds,
            });

            // Batch fetch todo counts for accepted shares
            const acceptedTaskIds = shares
                .filter((s) => s.status === 'accepted')
                .map((s) => s.task_id);

            let todoCounts = new Map<string, { total: number; completed: number }>();
            if (acceptedTaskIds.length > 0) {
                const { data: todos } = await supabase
                    .from('todos')
                    .select('task_id, completed')
                    .in('task_id', acceptedTaskIds);

                if (todos) {
                    for (const todo of todos) {
                        const current = todoCounts.get(todo.task_id) || { total: 0, completed: 0 };
                        current.total++;
                        if (todo.completed) current.completed++;
                        todoCounts.set(todo.task_id, current);
                    }
                }
            }

            const tasksMap = new Map(tasks?.map((t) => [t.id, t]) || []);
            const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

            return shares.map((share) => {
                const task = tasksMap.get(share.task_id);
                const profile = share.recipient_id ? profilesMap.get(share.recipient_id) : undefined;
                const counts = todoCounts.get(share.task_id) || { total: 0, completed: 0 };

                return {
                    ...(share as Share),
                    task_title: task?.title || 'Unknown Task',
                    task_description: task?.description || null,
                    counterpart_name: profile?.full_name || null,
                    counterpart_avatar: profile?.avatar_url || null,
                    counterpart_email: null,
                    total_count: counts.total,
                    completed_count: counts.completed,
                };
            });
        },
        enabled: !!user,
    });
};

// ─── Shares for a specific task (used in ShareTaskSheet) ────

export const useSharesForTask = (taskId: string) => {
    return useQuery({
        queryKey: shareKeys.forTask(taskId),
        queryFn: async (): Promise<EnrichedShare[]> => {
            const { data: shares, error } = await supabase
                .from('shares')
                .select('*')
                .eq('task_id', taskId)
                .in('status', ['pending', 'accepted'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!shares || shares.length === 0) return [];

            // recipient_id is nullable in the schema; drop nulls so the RPC gets
            // a clean string[] and we never look up an undefined profile.
            const recipientIds = [
                ...new Set(
                    shares
                        .map((s) => s.recipient_id)
                        .filter((id): id is string => Boolean(id)),
                ),
            ];
            const { data: profiles } = await supabase.rpc('get_profiles_by_ids', {
                p_user_ids: recipientIds,
            });

            const profilesMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

            return shares.map((share) => {
                const profile = profilesMap.get(share.recipient_id);
                return {
                    ...(share as Share),
                    task_title: '',
                    task_description: null,
                    counterpart_name: profile?.full_name || null,
                    counterpart_avatar: profile?.avatar_url || null,
                    counterpart_email: null,
                    total_count: 0,
                    completed_count: 0,
                };
            });
        },
        enabled: !!taskId,
    });
};

// ─── Create a share ─────────────────────────────────────────

export const useCreateShare = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({
            taskId,
            recipientId,
            includeBranches = false,
        }: {
            taskId: string;
            recipientId: string;
            includeBranches?: boolean;
        }) => {
            const shareData: ShareInsert = {
                task_id: taskId,
                owner_id: user!.id,
                recipient_id: recipientId,
                include_branches: includeBranches,
            };

            const { data, error } = await supabase
                .from('shares')
                .insert(shareData)
                .select()
                .single();

            if (error) {
                // Attach the Supabase error code for caller to handle
                const err = new Error(error.message) as Error & { code?: string };
                err.code = error.code;
                throw err;
            }
            return data as Share;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: shareKeys.forTask(variables.taskId) });
            queryClient.invalidateQueries({ queryKey: shareKeys.sent });
        },
    });
};

// ─── Respond to a share (accept/reject) ─────────────────────

export const useRespondToShare = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            shareId,
            status,
            rejectionNote,
        }: {
            shareId: string;
            status: 'accepted' | 'rejected';
            rejectionNote?: string;
        }) => {
            const { data, error } = await supabase
                .from('shares')
                .update({
                    status,
                    rejection_note: rejectionNote || null,
                })
                .eq('id', shareId)
                .select()
                .single();

            if (error) {
                const err = new Error(error.message) as Error & { code?: string };
                err.code = error.code;
                throw err;
            }
            return data as Share;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: shareKeys.received });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};

// ─── Revoke a share ─────────────────────────────────────────

export const useRevokeShare = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ shareId, taskId }: { shareId: string; taskId: string }) => {
            const { data, error } = await supabase
                .from('shares')
                .update({ status: 'revoked' as const })
                .eq('id', shareId)
                .select()
                .single();

            if (error) throw error;
            return data as Share;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: shareKeys.forTask(variables.taskId) });
            queryClient.invalidateQueries({ queryKey: shareKeys.sent });
        },
    });
};

// ─── Search users ───────────────────────────────────────────

export const useSearchUsers = () => {
    return useMutation({
        mutationFn: async (query: string): Promise<UserSearchResult[]> => {
            if (query.trim().length < 2) return [];

            const { data, error } = await supabase.rpc('search_users', {
                search_query: query.trim(),
            });

            if (error) throw error;
            return (data || []) as UserSearchResult[];
        },
    });
};

// ─── Notifications ──────────────────────────────────────────

export const useNotifications = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: shareKeys.notifications,
        queryFn: async (): Promise<InAppNotification[]> => {
            const { data, error } = await supabase
                .from('in_app_notifications')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return (data || []) as InAppNotification[];
        },
        enabled: !!user,
    });
};

export const useUnreadNotificationCount = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: shareKeys.unreadCount,
        queryFn: async (): Promise<number> => {
            const { count, error } = await supabase
                .from('in_app_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user!.id)
                .eq('read', false);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!user,
    });
};

export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from('in_app_notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: shareKeys.notifications });
            queryClient.invalidateQueries({ queryKey: shareKeys.unreadCount });
        },
    });
};

export const useMarkAllNotificationsRead = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('in_app_notifications')
                .update({ read: true })
                .eq('user_id', user!.id)
                .eq('read', false);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: shareKeys.notifications });
            queryClient.invalidateQueries({ queryKey: shareKeys.unreadCount });
        },
    });
};

// ─── Peek at pending shared task todos ──────────────────────

export type PeekTodo = {
    id: string;
    title: string;
    completed: boolean;
    order: number;
};

export const usePeekTaskTodos = (shareId: string) => {
    return useQuery({
        queryKey: ['shares', 'peek', shareId] as const,
        queryFn: async (): Promise<PeekTodo[]> => {
            const { data, error } = await supabase.rpc('peek_shared_task_todos', {
                p_share_id: shareId,
            });

            if (error) throw error;
            return (data || []) as PeekTodo[];
        },
        enabled: !!shareId,
    });
};
