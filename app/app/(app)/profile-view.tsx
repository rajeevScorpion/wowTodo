import { ReactNode } from 'react';
import { YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { User, Calendar, Briefcase, MapPin, FileText, Pencil } from 'lucide-react-native';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { Screen } from '../../src/components/ui/Screen';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { useProfile } from '../../src/features/profile/api';
import { useAuth } from '../../src/providers/AuthProvider';

function ProfileField({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
    return (
        <XStack alignItems="center" gap="$3" paddingVertical="$2">
            {icon}
            <YStack flex={1}>
                <AppText variant="muted" size="xs">{label}</AppText>
                <AppText size="md">{value || 'Not set'}</AppText>
            </YStack>
        </XStack>
    );
}

export default function ProfileViewScreen() {
    const router = useRouter();
    const colors = useSemanticColors();
    const { user } = useAuth();
    const { data: profile, isLoading } = useProfile();

    return (
        <Screen edges={['left', 'right']} scroll>
            <YStack flex={1} padding="$4" gap="$6">
                {/* Header with Edit button */}
                <XStack justifyContent="space-between" alignItems="center">
                    <Heading level={2}>Profile</Heading>
                    <Button
                        variant="outline"
                        size="sm"
                        onPress={() => router.push('/(app)/profile' as any)}
                    >
                        <XStack alignItems="center" gap="$2">
                            <Pencil size={14} color={colors.primary} />
                            <AppText weight="medium" size="sm" color={colors.primary}>Edit</AppText>
                        </XStack>
                    </Button>
                </XStack>

                {isLoading ? (
                    <YStack flex={1} justifyContent="center" alignItems="center">
                        <AppText variant="muted">Loading profile...</AppText>
                    </YStack>
                ) : (
                    <YStack gap="$4">
                        <ProfileField
                            icon={<User size={18} color={colors.muted} />}
                            label="Full Name"
                            value={profile?.full_name}
                        />
                        <ProfileField
                            icon={<Calendar size={18} color={colors.muted} />}
                            label="Date of Birth"
                            value={profile?.date_of_birth}
                        />
                        <ProfileField
                            icon={<Briefcase size={18} color={colors.muted} />}
                            label="Profession"
                            value={profile?.profession}
                        />
                        <ProfileField
                            icon={<MapPin size={18} color={colors.muted} />}
                            label="City"
                            value={profile?.city}
                        />
                        <ProfileField
                            icon={<FileText size={18} color={colors.muted} />}
                            label="Bio"
                            value={profile?.bio}
                        />
                    </YStack>
                )}

                {user?.email && (
                    <AppText variant="muted" size="xs">
                        Signed in as {user.email}
                    </AppText>
                )}
            </YStack>
        </Screen>
    );
}
