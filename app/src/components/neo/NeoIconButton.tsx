import { Platform } from 'react-native';
import { styled, XStack } from 'tamagui';

export const NeoIconButton = styled(XStack, {
    name: 'NeoIconButton',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '$neoSurface',
    borderWidth: 1,
    borderColor: '$hairline',

    pressStyle: {
        opacity: 0.7,
        scale: 0.95,
    },

    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
        },
        android: {
            elevation: 3,
        },
        default: {},
    }),
});
