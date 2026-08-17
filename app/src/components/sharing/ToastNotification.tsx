import { Animated, StyleSheet, Pressable } from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack } from 'tamagui';
import { X } from 'lucide-react-native';
import { AppText } from '../ui/AppText';
import { useSemanticColors } from '../../design-system/useSemanticColors';
import { useToast } from '../../contexts/ToastContext';

export function ToastNotification() {
    const { toasts, dismissToast } = useToast();
    const insets = useSafeAreaInsets();
    const colors = useSemanticColors();

    if (toasts.length === 0) return null;

    // Only show the latest toast
    const toast = toasts[toasts.length - 1];

    return (
        <ToastItem
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={() => dismissToast(toast.id)}
            bottom={80 + insets.bottom}
            colors={colors}
        />
    );
}

function ToastItem({
    message,
    type,
    onDismiss,
    bottom,
    colors,
}: {
    message: string;
    type: string;
    onDismiss: () => void;
    bottom: number;
    colors: any;
}) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const bgColor =
        type === 'success'
            ? colors.success
            : type === 'warning'
              ? colors.warning
              : colors.primary;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    bottom,
                    opacity,
                    transform: [{ translateY }],
                    backgroundColor: bgColor,
                },
            ]}
        >
            <XStack alignItems="center" gap="$2" flex={1}>
                <AppText size="sm" weight="medium" color="#FFFFFF" flex={1} numberOfLines={2}>
                    {message}
                </AppText>
                <Pressable onPress={onDismiss} hitSlop={8}>
                    <X size={16} color="#FFFFFF" />
                </Pressable>
            </XStack>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderRadius: 12,
        padding: 14,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
});
