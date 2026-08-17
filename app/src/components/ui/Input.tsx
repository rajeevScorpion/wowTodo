import { forwardRef, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { YStack } from 'tamagui';
import { AppText } from './AppText';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
    ({ label, error, style, ...props }, ref) => {
        const [focused, setFocused] = useState(false);
        const colors = useSemanticColors();

        const borderColor = error
            ? colors.error
            : focused
            ? colors.primary
            : colors.borderColor;

        return (
            <YStack width="100%" gap="$1.5">
                {label && (
                    <AppText size="sm" weight="medium" color={colors.color}>
                        {label}
                    </AppText>
                )}
                <TextInput
                    ref={ref}
                    placeholderTextColor={colors.placeholderColor}
                    onFocus={(e) => {
                        setFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        props.onBlur?.(e);
                    }}
                    style={[
                        {
                            height: 44,
                            width: '100%',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor,
                            backgroundColor: colors.cardBackground,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 16,
                            color: colors.color,
                        },
                        style,
                    ]}
                    {...props}
                />
                {error && (
                    <AppText size="sm" weight="medium" variant="error">
                        {error}
                    </AppText>
                )}
            </YStack>
        );
    }
);

Input.displayName = 'Input';
