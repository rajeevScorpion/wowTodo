import { styled, Text } from 'tamagui';

export const Heading = styled(Text, {
    fontFamily: '$heading',
    color: '$color',
    fontWeight: '700',

    variants: {
        level: {
            1: {
                fontSize: 30,
                lineHeight: 36,
                fontWeight: '800',
            },
            2: {
                fontSize: 24,
                lineHeight: 30,
                fontWeight: '700',
            },
            3: {
                fontSize: 20,
                lineHeight: 26,
                fontWeight: '600',
            },
            4: {
                fontSize: 16,
                lineHeight: 22,
                fontWeight: '600',
            },
        },
    } as const,

    defaultVariants: {
        level: 2,
    },
});
