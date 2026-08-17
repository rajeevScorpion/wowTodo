import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic } from 'lucide-react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface FloatingActionButtonProps {
    onPress: () => void;
    icon?: ReactNode;
}

export function FloatingActionButton({ onPress, icon }: FloatingActionButtonProps) {
    const insets = useSafeAreaInsets();
    const colors = useSemanticColors();

    return (
        <AnimatedPressable
            onPress={onPress}
            scaleDown={0.9}
            style={[styles.fab, { bottom: insets.bottom + 24, backgroundColor: colors.primary }]}
        >
            {icon ?? <Mic color="white" size={24} />}
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});
