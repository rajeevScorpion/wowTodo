import { Platform, StyleSheet } from 'react-native';
import { styled, YStack } from 'tamagui';

export const NeoCard = styled(YStack, {
    name: 'NeoCard',
    backgroundColor: '$neoSurface',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '$hairline',
    padding: '$4',

    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
        },
        android: {
            elevation: 4,
        },
        default: {},
    }),

    variants: {
        flat: {
            true: {
                ...Platform.select({
                    ios: {
                        shadowOpacity: 0,
                    },
                    android: {
                        elevation: 0,
                    },
                    default: {},
                }),
            },
        },
    } as const,
});
