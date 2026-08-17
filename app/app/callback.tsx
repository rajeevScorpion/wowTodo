import { useEffect, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { YStack } from 'tamagui';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { AppText } from '../src/components/ui/AppText';
import { useSemanticColors } from '../src/design-system/useSemanticColors';

export default function Callback() {
    const url = Linking.useURL();
    const router = useRouter();
    const colors = useSemanticColors();
    const handled = useRef(false);

    useEffect(() => {
        if (!url || handled.current) return;
        handled.current = true;

        const handleCallback = async () => {
            try {
                const params = extractParams(url);

                // Handle password recovery flow
                if (params.type === 'recovery' && params.access_token) {
                    await supabase.auth.setSession({
                        access_token: params.access_token,
                        refresh_token: params.refresh_token,
                    });
                    router.replace('/reset-password');
                    return;
                }

                // For OAuth: try exchanging code, but if login.tsx already
                // exchanged it (race condition), just check for existing session
                if (url.includes('code=')) {
                    try {
                        await supabase.auth.exchangeCodeForSession(url);
                    } catch {
                        // Code may have already been exchanged by login.tsx — that's OK
                    }
                } else if (params.access_token) {
                    await supabase.auth.setSession({
                        access_token: params.access_token,
                        refresh_token: params.refresh_token,
                    });
                }

                // Check if session exists (either we just set it or login.tsx did)
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    router.replace('/(app)');
                } else {
                    router.replace('/(auth)/login');
                }
            } catch (err) {
                console.error('Callback error:', err);
                router.replace('/(auth)/login');
            }
        };

        handleCallback();
    }, [url]);

    return (
        <YStack
            flex={1}
            justifyContent="center"
            alignItems="center"
            backgroundColor={colors.background}
        >
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="muted" marginTop="$4">
                Signing in...
            </AppText>
        </YStack>
    );
}

function extractParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    const queryString = url.split('?')[1];
    const fragmentString = url.split('#')[1];

    const process = (str: string) => {
        str.split('&').forEach((pair) => {
            const [key, value] = pair.split('=');
            if (key && value) {
                params[key] = decodeURIComponent(value);
            }
        });
    };

    if (queryString) process(queryString);
    if (fragmentString) process(fragmentString);
    return params;
}
