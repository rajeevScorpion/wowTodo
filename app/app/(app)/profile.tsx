import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { YStack, XStack, View } from 'tamagui';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { Screen } from '../../src/components/ui/Screen';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuth } from '../../src/providers/AuthProvider';
import { useProfile, useUpdateProfile, useCreateProfile } from '../../src/features/profile/api';
import { User, Calendar, Briefcase, MapPin, FileText } from 'lucide-react-native';

export default function ProfileScreen() {
    const { user } = useAuth();
    const { data: profile, isLoading } = useProfile();
    const updateProfile = useUpdateProfile();
    const createProfile = useCreateProfile();
    const colors = useSemanticColors();

    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [profession, setProfession] = useState('');
    const [city, setCity] = useState('');
    const [bio, setBio] = useState('');

    // Load profile data when available
    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setDateOfBirth(profile.date_of_birth || '');
            setProfession(profile.profession || '');
            setCity(profile.city || '');
            setBio(profile.bio || '');
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        if (!fullName.trim()) {
            Alert.alert('Required', 'Full name is required.');
            return;
        }

        const fields = {
            full_name: fullName.trim() || null,
            avatar_url: profile?.avatar_url ?? null,
            date_of_birth: dateOfBirth.trim() || null,
            profession: profession.trim() || null,
            city: city.trim() || null,
            bio: bio.trim() || null,
        };

        try {
            if (profile) {
                await updateProfile.mutateAsync(fields);
            } else {
                await createProfile.mutateAsync({ user_id: user.id, ...fields });
            }
            Alert.alert('Success', 'Profile saved successfully!');
        } catch (error: any) {
            const message = error?.message || 'Failed to save profile. Please try again.';
            Alert.alert('Error', message);
        }
    };

    const isSaving = updateProfile.isPending || createProfile.isPending;

    return (
        <Screen edges={['left', 'right']} scroll>
            <YStack flex={1} padding="$4" gap="$6">
                {/* Header */}
                <YStack gap="$2">
                    <Heading level={2}>My Profile</Heading>
                    <AppText variant="muted" size="sm">
                        Tell us a bit about yourself
                    </AppText>
                </YStack>

                {isLoading ? (
                    <YStack flex={1} justifyContent="center" alignItems="center">
                        <AppText variant="muted">Loading profile...</AppText>
                    </YStack>
                ) : (
                    <YStack gap="$5">
                        {/* Full Name */}
                        <YStack gap="$2">
                            <XStack alignItems="center" gap="$2">
                                <User size={18} color="$color" />
                                <AppText weight="medium" size="sm">Full Name</AppText>
                            </XStack>
                            <Input
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Enter your full name"
                                autoCapitalize="words"
                            />
                        </YStack>

                        {/* Date of Birth */}
                        <YStack gap="$2">
                            <XStack alignItems="center" gap="$2">
                                <Calendar size={18} color="$color" />
                                <AppText weight="medium" size="sm">Date of Birth</AppText>
                            </XStack>
                            <Input
                                value={dateOfBirth}
                                onChangeText={setDateOfBirth}
                                placeholder="YYYY-MM-DD"
                                keyboardType="numbers-and-punctuation"
                            />
                            <AppText variant="muted" size="xs">
                                Format: YYYY-MM-DD (e.g., 1990-01-15)
                            </AppText>
                        </YStack>

                        {/* Profession */}
                        <YStack gap="$2">
                            <XStack alignItems="center" gap="$2">
                                <Briefcase size={18} color="$color" />
                                <AppText weight="medium" size="sm">Profession</AppText>
                            </XStack>
                            <Input
                                value={profession}
                                onChangeText={setProfession}
                                placeholder="What do you do?"
                                autoCapitalize="words"
                            />
                        </YStack>

                        {/* City */}
                        <YStack gap="$2">
                            <XStack alignItems="center" gap="$2">
                                <MapPin size={18} color="$color" />
                                <AppText weight="medium" size="sm">City</AppText>
                            </XStack>
                            <Input
                                value={city}
                                onChangeText={setCity}
                                placeholder="Where do you live?"
                                autoCapitalize="words"
                            />
                        </YStack>

                        {/* Bio */}
                        <YStack gap="$2">
                            <XStack alignItems="center" gap="$2">
                                <FileText size={18} color="$color" />
                                <AppText weight="medium" size="sm">Bio</AppText>
                            </XStack>
                            <Input
                                value={bio}
                                onChangeText={setBio}
                                placeholder="A short description about yourself..."
                                multiline
                                numberOfLines={4}
                                maxLength={500}
                            />
                            <XStack justifyContent="flex-end">
                                <AppText variant="muted" size="xs">
                                    {bio.length}/500
                                </AppText>
                            </XStack>
                        </YStack>

                        {/* Save Button */}
                        <Button
                            onPress={handleSave}
                            disabled={isSaving}
                            size="lg"
                            fullWidth
                        >
                            <AppText weight="medium" color={colors.color}>Save Profile</AppText>
                        </Button>
                    </YStack>
                )}
            </YStack>
        </Screen>
    );
}
