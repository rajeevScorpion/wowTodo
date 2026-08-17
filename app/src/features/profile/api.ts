import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { UserProfile, Database } from '../../types';

type ProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

export const profileKeys = {
    all: ['profile'] as const,
};

export const useProfile = () => {
    const { session } = useAuth();
    return useQuery({
        queryKey: profileKeys.all,
        queryFn: async (): Promise<UserProfile | null> => {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .single();

            if (error) {
                // If no profile exists yet, return null
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }
            return data as UserProfile;
        },
        enabled: !!session,
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (profile: ProfileUpdate) => {
            const { data, error } = await supabase
                .from('user_profiles')
                .update(profile)
                .eq('user_id', user!.id)
                .select()
                .single();

            if (error) throw error;
            return data as UserProfile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: profileKeys.all });
        },
    });
};

export const useCreateProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (profile: ProfileInsert) => {
            const { data, error } = await supabase
                .from('user_profiles')
                .upsert(profile, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;
            return data as UserProfile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: profileKeys.all });
        },
    });
};

// Sync Google OAuth avatar_url into user_profiles (call on login)
export const useSyncAvatarUrl = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useCallback(async () => {
        if (!user) return;
        const avatarUrl = (user.user_metadata as any)?.avatar_url;
        if (!avatarUrl) return;

        // Upsert: update if profile exists, skip if no profile yet
        const { error } = await supabase
            .from('user_profiles')
            .update({ avatar_url: avatarUrl })
            .eq('user_id', user.id);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: profileKeys.all });
        }
    }, [user, queryClient]);
};
