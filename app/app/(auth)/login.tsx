import { Alert, Image } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Screen } from '../../src/components/ui/Screen';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';
import { GoogleIcon } from '../../src/components/ui/GoogleIcon';
import { supabase } from '../../src/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = Linking.createURL('callback');

/**
 * Google is the only way into WowTodo.
 *
 * Email/password sign-in, sign-up and password reset were removed deliberately:
 * one hassle-free path beats three half-used ones, and it removes password
 * storage, reset emails and the "check your email" dead end from the product
 * entirely. Existing email accounts are not deleted — GoTrue links a Google
 * identity onto the existing user when the verified Google address matches, so
 * anyone who signed up with a Gmail address keeps their data.
 */
export default function Login() {
    const [loading, setLoading] = useState(false);

    const onGoogleLogin = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo, skipBrowserRedirect: true },
            });
            if (error) throw error;
            if (!data?.url) throw new Error('Google sign-in is unavailable right now.');

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

            // The user backing out of the consent screen is not an error.
            if (result.type !== 'success' || !result.url) return;

            const url = result.url;
            if (url.includes('error')) {
                const params = extractParamsFromUrl(url);
                throw new Error(params.error_description || 'Google rejected the sign-in.');
            }

            if (url.includes('code=')) {
                try {
                    await supabase.auth.exchangeCodeForSession(url);
                } catch {
                    // The callback route may have exchanged it first — that's fine,
                    // the session check below is what decides.
                }
            } else if (url.includes('access_token') || url.includes('refresh_token')) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    const params = extractParamsFromUrl(url);
                    if (params.access_token && params.refresh_token) {
                        await supabase.auth.setSession({
                            access_token: params.access_token,
                            refresh_token: params.refresh_token,
                        });
                    }
                }
            }

            // Returning to a login screen with no explanation is the worst
            // possible outcome, so confirm a session actually exists.
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Signed in with Google, but no session was created. Please try again.');
            }
        } catch (error: any) {
            const msg = error?.message || 'An unknown error occurred';
            Alert.alert('Sign-in failed', typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen edges={['top', 'left', 'right']}>
            <YStack flex={1} alignItems="center" justifyContent="center">
                <YStack width="100%" maxWidth={400} gap="$6">
                    <YStack alignItems="center" gap="$3">
                        <Image
                            source={require('../../assets/images/icon.png')}
                            style={{ width: 72, height: 72, borderRadius: 16 }}
                        />
                        <Heading level={1}>WowTodo</Heading>
                        <AppText variant="muted" textAlign="center">
                            Speak it. Sort it. Done.
                        </AppText>
                    </YStack>

                    <Card padded gap="$4">
                        <Button
                            onPress={onGoogleLogin}
                            disabled={loading}
                            variant="outline"
                            fullWidth
                            size="lg"
                        >
                            <XStack alignItems="center" gap="$2">
                                <GoogleIcon size={20} />
                                <AppText weight="medium" size="lg">
                                    {loading ? 'Signing in…' : 'Continue with Google'}
                                </AppText>
                            </XStack>
                        </Button>

                        <AppText size="sm" variant="muted" textAlign="center">
                            We only use your Google account to sign you in.
                        </AppText>
                    </Card>
                </YStack>
            </YStack>
        </Screen>
    );
}

function extractParamsFromUrl(url: string): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    const queryString = url.split('?')[1];
    const fragmentString = url.split('#')[1];
    const process = (str: string) => {
        str.split('&').forEach((pair) => {
            const [key, value] = pair.split('=');
            if (key && value) params[key] = decodeURIComponent(value);
        });
    };
    if (queryString) process(queryString);
    if (fragmentString) process(fragmentString);
    return params;
}
