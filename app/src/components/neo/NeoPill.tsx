import { Platform } from 'react-native';
import { styled, XStack } from 'tamagui';

export const NeoPill = styled(XStack, {
    name: 'NeoPill',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: '$neoSurface',
    borderWidth: 1,
    borderColor: '$hairline',

    pressStyle: {
        opacity: 0.8,
    },

    variants: {
        active: {
            true: {
                backgroundColor: '$neoAccentGold',
                borderColor: '$neoAccentGold',
            },
        },
    } as const,
});
