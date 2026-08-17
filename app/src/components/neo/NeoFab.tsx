import { ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic } from 'lucide-react-native';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface NeoFabProps {
    onPress: () => void;
    icon?: ReactNode;
    color?: string;
}

const FAB_SIZE = 56;

export function NeoFab({ onPress, icon, color }: NeoFabProps) {
    const insets = useSafeAreaInsets();
    const colors = useSemanticColors();
    const bg = color ?? colors.neoAccentGold;

    return (
        <AnimatedPressable
            onPress={onPress}
            scaleDown={0.9}
            style={[
                styles.fab,
                {
                    bottom: insets.bottom + 24,
                    backgroundColor: bg,
                },
            ]}
        >
            {icon ?? <Mic color="white" size={24} />}
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 24,
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.10,
                shadowRadius: 14,
            },
            android: {
                elevation: 6,
            },
            default: {},
        }),
    },
});
