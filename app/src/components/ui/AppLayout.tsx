import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Header } from './Header';
import { BottomBar } from './BottomBar';
import { ToastNotification } from '../sharing/ToastNotification';
import { useRealtimeSharing } from '../../features/sharing/useRealtimeSharing';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const colors = useSemanticColors();
    useRealtimeSharing();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header />
            <View style={styles.content}>
                {children}
            </View>
            <BottomBar />
            <ToastNotification />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
