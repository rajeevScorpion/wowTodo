import { Platform } from 'react-native';
import { styled, YStack, XStack, Text } from 'tamagui';

export const Card = styled(YStack, {
    backgroundColor: '$neoSurface',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '$hairline',

    variants: {
        elevated: {
            true: {
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
            },
        },
        padded: {
            true: {
                padding: '$4',
            },
        },
    } as const,

    defaultVariants: {
        elevated: true,
    },
});

export const CardHeader = styled(YStack, {
    padding: '$6',
    gap: '$1.5',
});

export const CardTitle = styled(Text, {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: '$color',
});

export const CardContent = styled(YStack, {
    paddingHorizontal: '$6',
    paddingBottom: '$6',
});

export const CardFooter = styled(XStack, {
    paddingHorizontal: '$6',
    paddingBottom: '$6',
    alignItems: 'center',
});
