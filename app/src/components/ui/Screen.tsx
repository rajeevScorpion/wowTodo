import { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, YStackProps } from 'tamagui';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface ScreenProps extends Omit<YStackProps, 'children'> {
    children: ReactNode;
    scroll?: boolean;
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({
    children,
    scroll = false,
    edges = ['top', 'left', 'right'],
    ...rest
}: ScreenProps) {
    const colors = useSemanticColors();
    
    const content = (
        <YStack flex={1} padding="$4" {...rest}>
            {children}
        </YStack>
    );

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: colors.background }}
            edges={edges}
        >
            {scroll ? (
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {content}
                </ScrollView>
            ) : (
                content
            )}
        </SafeAreaView>
    );
}
