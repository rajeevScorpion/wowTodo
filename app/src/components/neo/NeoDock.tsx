import { Platform } from 'react-native';
import { styled, XStack } from 'tamagui';

export const NeoDock = styled(XStack, {
    name: 'NeoDock',
    backgroundColor: '$neoSurface',
    borderTopWidth: 1,
    borderTopColor: '$hairline',
    alignItems: 'center',
    paddingHorizontal: '$2',

    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
        },
        android: {
            elevation: 8,
        },
        default: {},
    }),
});
