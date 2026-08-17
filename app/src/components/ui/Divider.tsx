import { styled, View } from 'tamagui';

export const Divider = styled(View, {
    height: 1,
    backgroundColor: '$borderColor',
    width: '100%',

    variants: {
        vertical: {
            true: {
                height: 'auto',
                width: 1,
                alignSelf: 'stretch',
            },
        },
    } as const,
});
