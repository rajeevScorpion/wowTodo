import { Alert } from 'react-native';
import { YStack } from 'tamagui';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Input } from '../src/components/ui/Input';
import { Screen } from '../src/components/ui/Screen';
import { Heading } from '../src/components/ui/Heading';
import { AppText } from '../src/components/ui/AppText';
import { supabase } from '../src/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function ResetPassword() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const onUpdatePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Missing fields', 'Please fill in both password fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Password mismatch', 'Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Password too short', 'Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            router.replace('/(app)');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen edges={['top', 'left', 'right']}>
            <YStack flex={1} alignItems="center" justifyContent="center">
                <YStack width="100%" maxWidth={400} gap="$6">
                    <YStack alignItems="center" gap="$2">
                        <Heading level={1}>Set New Password</Heading>
                        <AppText variant="secondary" textAlign="center">
                            Enter a new password for your account.
                        </AppText>
                    </YStack>

                    <Card padded gap="$4">
                        <Input
                            label="New Password"
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        <Input
                            label="Confirm Password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                        <Button
                            onPress={onUpdatePassword}
                            disabled={loading}
                            fullWidth
                            size="lg"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </Card>
                </YStack>
            </YStack>
        </Screen>
    );
}
