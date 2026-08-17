import { Alert, Image } from 'react-native';
import { YStack, View } from 'tamagui';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Screen } from '../../src/components/ui/Screen';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';
import { supabase } from '../../src/lib/supabase';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';

export default function ForgotPassword() {
    const router = useRouter();
    const colors = useSemanticColors();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const onSendReset = async () => {
        if (!email) {
            Alert.alert('Missing email', 'Please enter your email address.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: Linking.createURL('callback'),
            });
            if (error) throw error;
            setSent(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen edges={['top', 'left', 'right']}>
            <YStack flex={1} alignItems="center" justifyContent="center">
                <YStack width="100%" maxWidth={400} gap="$6">
                    <YStack alignItems="center" gap="$2">
                        <Image
                            source={require('../../assets/images/icon.png')}
                            style={{ width: 64, height: 64, borderRadius: 14, marginBottom: 8 }}
                        />
                        <Heading level={1}>Reset Password</Heading>
                        <AppText variant="secondary" textAlign="center">
                            {sent
                                ? `A reset link has been sent to ${email}`
                                : "Enter your email and we'll send you a reset link."}
                        </AppText>
                    </YStack>

                    <Card padded gap="$4">
                        {sent ? (
                            <YStack alignItems="center" gap="$4" paddingVertical="$2">
                                <View
                                    width={56}
                                    height={56}
                                    borderRadius="$10"
                                    backgroundColor={colors.successBackground}
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <AppText fontSize={24}>✓</AppText>
                                </View>
                                <AppText variant="secondary" textAlign="center">
                                    Check your inbox and click the link to set a new password.
                                </AppText>
                                <Button
                                    onPress={() => router.replace('/(auth)/login')}
                                    variant="outline"
                                    fullWidth
                                    size="lg"
                                >
                                    Back to Sign In
                                </Button>
                            </YStack>
                        ) : (
                            <>
                                <Input
                                    placeholder="you@example.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Button
                                    onPress={onSendReset}
                                    disabled={loading}
                                    fullWidth
                                    size="lg"
                                >
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </Button>
                                <Button
                                    onPress={() => router.back()}
                                    variant="ghost"
                                    fullWidth
                                >
                                    Back to Sign In
                                </Button>
                            </>
                        )}
                    </Card>
                </YStack>
            </YStack>
        </Screen>
    );
}
