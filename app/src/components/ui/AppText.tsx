import { styled, Text } from 'tamagui';

export const AppText = styled(Text, {
    fontFamily: '$body',
    color: '$color',
    fontSize: 16,
    lineHeight: 24,

    variants: {
        variant: {
            default: {
                color: '$color',
            },
            muted: {
                color: '$muted',
            },
            secondary: {
                color: '$secondary',
            },
            error: {
                color: '$error',
            },
        },
        size: {
            xs: {
                fontSize: 11,
                lineHeight: 16,
            },
            sm: {
                fontSize: 12,
                lineHeight: 17,
            },
            md: {
                fontSize: 14,
                lineHeight: 20,
            },
            lg: {
                fontSize: 16,
                lineHeight: 24,
            },
            xl: {
                fontSize: 18,
                lineHeight: 26,
            },
        },
        weight: {
            normal: { fontWeight: '400' },
            medium: { fontWeight: '500' },
            semibold: { fontWeight: '600' },
            bold: { fontWeight: '700' },
        },
    } as const,

    defaultVariants: {
        variant: 'default',
        size: 'lg',
        weight: 'normal',
    },
});
