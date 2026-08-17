import { Pressable } from 'react-native';
import { XStack } from 'tamagui';
import { AppText } from './AppText';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface TabsProps {
    tabs: { value: string; label: string }[];
    value: string;
    onValueChange: (value: string) => void;
}

export function Tabs({ tabs, value, onValueChange }: TabsProps) {
    const colors = useSemanticColors();

    return (
        <XStack
            backgroundColor={colors.cardBackground}
            borderRadius="$3"
            padding="$1"
            alignItems="center"
            justifyContent="center"
        >
            {tabs.map((tab) => {
                const isActive = value === tab.value;
                return (
                    <Pressable
                        key={tab.value}
                        onPress={() => onValueChange(tab.value)}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 4,
                            paddingVertical: 6,
                            ...(isActive
                                ? {
                                      backgroundColor: colors.background,
                                      shadowColor: colors.shadowColor,
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.05,
                                      shadowRadius: 2,
                                      elevation: 1,
                                  }
                                : {}),
                        }}
                    >
                        <AppText
                            size="md"
                            weight="medium"
                            color={isActive ? colors.color : colors.muted}
                        >
                            {tab.label}
                        </AppText>
                    </Pressable>
                );
            })}
        </XStack>
    );
}
