import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { TaskGroup, Database } from '../../types';
import { taskKeys } from '../tasks/api';

type GroupInsert = Database['public']['Tables']['task_groups']['Insert'];

export const groupKeys = {
    all: ['groups'] as const,
};

export const useGroups = () => {
    return useQuery({
        queryKey: groupKeys.all,
        queryFn: async (): Promise<TaskGroup[]> => {
            const { data, error } = await supabase
                .from('task_groups')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data as TaskGroup[];
        },
    });
};

export const useCreateGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (group: GroupInsert) => {
            const { data, error } = await supabase
                .from('task_groups')
                .insert(group)
                .select()
                .single();

            if (error) throw error;
            return data as TaskGroup;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groupKeys.all });
        },
    });
};

export const useDeleteGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (groupId: string) => {
            const { error } = await supabase
                .from('task_groups')
                .delete()
                .eq('id', groupId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groupKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};

export const useRenameGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const { data, error } = await supabase
                .from('task_groups')
                .update({ name })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as TaskGroup;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groupKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};
