import { LinearGradient } from 'expo-linear-gradient';
import { YStack } from 'tamagui';
import { Heading } from './Heading';
import { AppText } from './AppText';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface GradientHeaderProps {
    title: string;
    subtitle?: string;
}

export function GradientHeader({ title, subtitle }: GradientHeaderProps) {
    const colors = useSemanticColors();

    return (
        <LinearGradient
            colors={[colors.primary, colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
                borderRadius: 16,
                overflow: 'hidden',
            }}
        >
            <YStack padding="$6" gap="$2">
                <Heading level={2} color={'white'}>
                    {title}
                </Heading>
                {subtitle && (
                    <AppText size="md" color={colors.muted} opacity={0.9}>
                        {subtitle}
                    </AppText>
                )}
            </YStack>
        </LinearGradient>
    );
}
