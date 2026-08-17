import { Alert, Image, Platform, TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Tabs } from '../../src/components/ui/Tabs';
import { Screen } from '../../src/components/ui/Screen';
import { AppText } from '../../src/components/ui/AppText';
import { Divider } from '../../src/components/ui/Divider';
import { GoogleIcon } from '../../src/components/ui/GoogleIcon';
import { supabase } from '../../src/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = Linking.createURL('callback');

const TABS = [
    { value: 'signin', label: 'Sign In' },
    { value: 'signup', label: 'Sign Up' },
];

function formatDobInput(text: string, previousText: string): string {
    // Strip non-digits
    const digits = text.replace(/\D/g, '');
    // Build formatted string with auto-slashes
    let formatted = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
        if (i === 2 || i === 4) formatted += '/';
        formatted += digits[i];
    }
    return formatted;
}

function parseDobString(text: string): Date | null {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1920) return null;
    const date = new Date(year, month - 1, day);
    if (date > new Date()) return null;
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) return null;
    return date;
}

export default function Login() {
    const router = useRouter();
    const [tab, setTab] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [dobText, setDobText] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDobTextChange = (text: string) => {
        const formatted = formatDobInput(text, dobText);
        setDobText(formatted);
        const parsed = parseDobString(formatted);
        setDateOfBirth(parsed);
    };

    const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) {
            setDateOfBirth(selectedDate);
            const dd = String(selectedDate.getDate()).padStart(2, '0');
            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const yyyy = selectedDate.getFullYear();
            setDobText(`${dd}/${mm}/${yyyy}`);
        }
    };

    const onSignIn = async () => {
        if (!email || !password) {
            Alert.alert('Missing fields', 'Please enter your email and password.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error: any) {
            Alert.alert('Sign In Failed', error.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const onSignUp = async () => {
        if (!email || !password) {
            Alert.alert('Missing fields', 'Please enter your email and password.');
            return;
        }
        if (!fullName.trim()) {
            Alert.alert('Missing fields', 'Please enter your full name.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Password mismatch', 'Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        date_of_birth: dateOfBirth
                            ? dateOfBirth.toISOString().split('T')[0]
                            : null,
                    },
                },
            });
            if (error) throw error;
            if (!data.session) {
                Alert.alert(
                    'Check your email',
                    `A confirmation link has been sent to ${email}. Please verify your email to continue.`
                );
            }
        } catch (error: any) {
            Alert.alert('Sign Up Failed', error.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const onGoogleLogin = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo, skipBrowserRedirect: true },
            });
            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
                if (result.type === 'success' && result.url) {
                    if (result.url.includes('error')) {
                        const params = extractParamsFromUrl(result.url);
                        throw new Error(params.error_description || 'OAuth error');
                    }
                    const url = result.url;
                    if (url.includes('code=')) {
                        try {
                            await supabase.auth.exchangeCodeForSession(url);
                        } catch {
                            // Code may have already been exchanged by callback route — that's OK
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
                }
            }
        } catch (error: any) {
            const msg = error.message || 'An unknown error occurred';
            Alert.alert('Login Failed', typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen edges={['top', 'left', 'right']}>
            <YStack flex={1} alignItems="center" justifyContent="center">
                <YStack width="100%" maxWidth={400} gap="$6">
                    <YStack alignItems="center">
                        <Image
                            source={require('../../assets/images/icon.png')}
                            style={{ width: 64, height: 64, borderRadius: 14 }}
                        />
                    </YStack>

                    <Card padded gap="$4">
                        <Tabs
                            tabs={TABS}
                            value={tab}
                            onValueChange={(v) => setTab(v as 'signin' | 'signup')}
                        />

                        <YStack gap="$3">
                            {tab === 'signup' && (
                                <>
                                    <Input
                                        placeholder="Full name"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        autoCapitalize="words"
                                    />
                                    <XStack gap="$2" alignItems="flex-start">
                                        <YStack flex={1}>
                                            <Input
                                                placeholder="DD/MM/YYYY"
                                                value={dobText}
                                                onChangeText={handleDobTextChange}
                                                keyboardType="number-pad"
                                                maxLength={10}
                                            />
                                        </YStack>
                                        <TouchableOpacity
                                            onPress={() => setShowDatePicker(true)}
                                            style={{
                                                height: 44,
                                                width: 44,
                                                borderRadius: 8,
                                                borderWidth: 1,
                                                borderColor: 'rgba(255,255,255,0.15)',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <AppText size="lg">📅</AppText>
                                        </TouchableOpacity>
                                    </XStack>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={dateOfBirth || new Date(2000, 0, 1)}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            maximumDate={new Date()}
                                            minimumDate={new Date(1920, 0, 1)}
                                            onChange={handleDatePickerChange}
                                        />
                                    )}
                                    {Platform.OS === 'ios' && showDatePicker && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onPress={() => setShowDatePicker(false)}
                                        >
                                            Done
                                        </Button>
                                    )}
                                </>
                            )}

                            <Input
                                placeholder="you@example.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <YStack>
                                <Input
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                                {tab === 'signin' && (
                                    <TouchableOpacity
                                        onPress={() => router.push('/(auth)/forgot-password')}
                                        style={{ marginTop: 4, alignSelf: 'flex-end' }}
                                    >
                                        <AppText size="sm" variant="muted">
                                            Forgot password?
                                        </AppText>
                                    </TouchableOpacity>
                                )}
                            </YStack>

                            {tab === 'signup' && (
                                <Input
                                    placeholder="Confirm password"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            )}
                        </YStack>

                        <Button
                            onPress={tab === 'signin' ? onSignIn : onSignUp}
                            disabled={loading}
                            fullWidth
                            size="lg"
                        >
                            {loading
                                ? 'Please wait...'
                                : tab === 'signin'
                                ? 'Sign In'
                                : 'Create Account'}
                        </Button>

                        <XStack alignItems="center" gap="$3">
                            <Divider flex={1} />
                            <AppText size="sm" variant="muted">or</AppText>
                            <Divider flex={1} />
                        </XStack>

                        <Button
                            onPress={onGoogleLogin}
                            disabled={loading}
                            variant="outline"
                            fullWidth
                            size="lg"
                        >
                            <XStack alignItems="center" gap="$2">
                                <GoogleIcon size={20} />
                                <AppText weight="medium" size="lg">Continue with Google</AppText>
                            </XStack>
                        </Button>
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
