import { Platform } from 'react-native';
import { styled, YStack } from 'tamagui';

export const NeoInset = styled(YStack, {
    name: 'NeoInset',
    backgroundColor: '$neoInset',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '$hairline',
    padding: '$3',

    // Subtle inner-shadow feel: top border slightly darker
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
        },
        android: {
            elevation: 0,
        },
        default: {},
    }),
});
