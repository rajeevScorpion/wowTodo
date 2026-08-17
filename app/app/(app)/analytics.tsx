import { YStack } from 'tamagui';
import { BarChart3 } from 'lucide-react-native';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { Screen } from '../../src/components/ui/Screen';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';

export default function AnalyticsScreen() {
    const colors = useSemanticColors();

    return (
        <Screen edges={['left', 'right']}>
            <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
                <BarChart3 size={48} color={colors.muted} />
                <Heading level={3}>Analytics</Heading>
                <AppText variant="muted" size="sm" textAlign="center">
                    Coming soon. Track your productivity and task completion trends.
                </AppText>
            </YStack>
        </Screen>
    );
}
