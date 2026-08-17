import { ReactNode } from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
    children: ReactNode;
    scaleDown?: number;
}

export function AnimatedPressable({
    children,
    scaleDown = 0.97,
    onPressIn,
    onPressOut,
    style,
    ...props
}: AnimatedPressableProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressableView
            onPressIn={(e) => {
                scale.value = withSpring(scaleDown, { damping: 15, stiffness: 300 });
                onPressIn?.(e);
            }}
            onPressOut={(e) => {
                scale.value = withSpring(1, { damping: 15, stiffness: 300 });
                onPressOut?.(e);
            }}
            style={[animatedStyle, style as any]}
            {...props}
        >
            {children}
        </AnimatedPressableView>
    );
}
