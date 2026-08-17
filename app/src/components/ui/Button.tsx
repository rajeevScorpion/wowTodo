import { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';
import { XStack } from 'tamagui';
import { AppText } from './AppText';
import { AnimatedPressable } from './AnimatedPressable';
import { useSemanticColors } from '../../design-system/useSemanticColors';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    children?: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: any;
}

const sizeStyles: Record<ButtonSize, {
    height: number;
    paddingHorizontal: number;
    paddingVertical: number;
}> = {
    sm: { height: 36, paddingHorizontal: 16, paddingVertical: 0 },
    md: { height: 44, paddingHorizontal: 32, paddingVertical: 0 },
    lg: { height: 56, paddingHorizontal: 32, paddingVertical: 0 },
};

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    onPress,
    disabled = false,
    loading = false,
    fullWidth = false,
    style,
}: ButtonProps) {
    const colors = useSemanticColors();
    const s = sizeStyles[size];

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    bg: colors.primary,
                    borderColor: 'transparent',
                    textColor: colors.color,
                };
            case 'outline':
                return {
                    bg: 'transparent',
                    borderColor: colors.borderColor,
                    textColor: colors.color,
                };
            case 'ghost':
                return {
                    bg: 'transparent',
                    borderColor: 'transparent',
                    textColor: colors.color,
                };
            case 'destructive':
                return {
                    bg: colors.error,
                    borderColor: 'transparent',
                    textColor: colors.color,
                };
            default:
                return {
                    bg: colors.primary,
                    borderColor: 'transparent',
                    textColor: colors.color,
                };
        }
    };

    const v = getVariantStyles();

    return (
        <AnimatedPressable
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                fullWidth && { width: '100%' },
                style,
            ]}
        >
            <XStack
                backgroundColor={v.bg}
                borderColor={v.borderColor}
                borderWidth={1}
                borderRadius="$3"
                height={s.height}
                paddingHorizontal={s.paddingHorizontal}
                paddingVertical={s.paddingVertical}
                alignItems="center"
                justifyContent="center"
                opacity={disabled || loading ? 0.5 : 1}
                width={fullWidth ? '100%' : undefined}
            >
                {loading ? (
                    <ActivityIndicator
                        color={v.textColor}
                        size="small"
                    />
                ) : typeof children === 'string' ? (
                    <AppText
                        weight="medium"
                        size="lg"
                        color={v.textColor}
                    >
                        {children}
                    </AppText>
                ) : (
                    children
                )}
            </XStack>
        </AnimatedPressable>
    );
}
