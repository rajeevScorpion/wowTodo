import { ReactNode, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { YStack, XStack, View } from 'tamagui';
import { useSemanticColors } from '../../design-system/useSemanticColors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

export interface MenuItem {
    icon: ReactNode;
    label: string;
    onPress: () => void;
    disabled?: boolean;
}

interface PopoutMenuProps {
    visible: boolean;
    onClose: () => void;
    items: MenuItem[];
    anchorX?: number;
    anchorY?: number;
    anchorBottom?: number;
}

export function PopoutMenu({ visible, onClose, items, anchorX = 24, anchorY, anchorBottom }: PopoutMenuProps) {
    const colors = useSemanticColors();
    const opacity = useSharedValue(0);

    const handleItemPress = (onPress: () => void) => {
        onClose();
        onPress();
    };

    // Animate in/out via useEffect (not during render) to avoid Fabric crash
    useEffect(() => {
        opacity.value = withTiming(visible ? 1 : 0, { duration: visible ? 60 : 40 });
    }, [visible]);

    const menuStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            {/* Transparent dismiss layer */}
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

            {/* Menu */}
            <AnimatedView
                style={[
                    styles.menuContainer,
                    { left: anchorX },
                    anchorY !== undefined && { top: anchorY },
                    anchorBottom !== undefined && { bottom: anchorBottom },
                    menuStyle,
                ]}
                pointerEvents="box-none"
            >
                <YStack
                    backgroundColor="$background"
                    borderRadius="$4"
                    padding="$2"
                    shadowColor="$shadowColor"
                    shadowOpacity={0.2}
                    shadowRadius={12}
                    shadowOffset={{ width: 0, height: 4 }}
                    borderWidth={1}
                    borderColor="$borderColor"
                    gap="$1"
                    minWidth={200}
                >
                    {items.map((item, index) => (
                        <Pressable
                            key={index}
                            onPress={() => handleItemPress(item.onPress)}
                            disabled={item.disabled}
                            style={({ pressed }) => [
                                styles.menuItem,
                                pressed && !item.disabled && styles.menuItemPressed,
                            ]}
                        >
                            <XStack
                                alignItems="center"
                                gap="$3"
                                padding="$3"
                                opacity={item.disabled ? 0.4 : 1}
                            >
                                {item.icon}
                                <YStack flex={1}>
                                    <Text
                                        style={{
                                            color: colors.color,
                                            fontSize: 16,
                                            fontWeight: '500',
                                        }}
                                    >
                                        {item.label}
                                    </Text>
                                </YStack>
                            </XStack>
                        </Pressable>
                    ))}
                </YStack>
            </AnimatedView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    menuContainer: {
        position: 'absolute',
        zIndex: 1001,
    },
    menuItem: {
        borderRadius: 8,
    },
    menuItemPressed: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
});
