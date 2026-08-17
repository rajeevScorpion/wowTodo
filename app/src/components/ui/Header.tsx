import { useState } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { Menu, User, BarChart3, Bell } from 'lucide-react-native';
import { AppText } from './AppText';
import { AnimatedPressable } from './AnimatedPressable';
import { PopoutMenu, MenuItem } from './PopoutMenu';
import { useSemanticColors } from '../../design-system/useSemanticColors';
import { useUnreadNotificationCount } from '../../features/sharing/api';

const HEADER_HEIGHT = 60;

export function Header() {
    const colors = useSemanticColors();
    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);
    const screenWidth = Dimensions.get('window').width;
    const { data: unreadCount = 0 } = useUnreadNotificationCount();

    const menuItems: MenuItem[] = [
        {
            icon: <User size={20} color={colors.color} />,
            label: 'Profile',
            onPress: () => router.push('/(app)/profile-view' as any),
        },
        {
            icon: <BarChart3 size={20} color={colors.color} />,
            label: 'Analytics',
            onPress: () => router.push('/(app)/analytics' as any),
        },
    ];

    return (
        <SafeAreaView
            edges={['top', 'left', 'right']}
            style={{
                backgroundColor: colors.neoSurface,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.hairline,
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06,
                        shadowRadius: 10,
                    },
                    android: {
                        elevation: 4,
                    },
                }),
                zIndex: 10,
            }}
        >
            <XStack
                height={HEADER_HEIGHT}
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal="$4"
            >
                <AppText weight="bold" size="xl" color={colors.color} fontSize={22} lineHeight={30} fontWeight="900">
                    wowtodo
                </AppText>
                <XStack alignItems="center" gap="$3">
                    <AnimatedPressable
                        onPress={() => router.push('/(app)/notifications' as any)}
                        scaleDown={0.9}
                    >
                        <View style={styles.bellContainer}>
                            <Bell size={24} color={colors.muted} />
                            {unreadCount > 0 && (
                                <View style={styles.badgeContainer}>
                                    <AppText
                                        size="xs"
                                        color="#FFFFFF"
                                        fontSize={unreadCount > 9 ? 9 : 11}
                                        lineHeight={14}
                                        fontWeight="700"
                                        style={styles.badgeText}
                                    >
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </AppText>
                                </View>
                            )}
                        </View>
                    </AnimatedPressable>
                    <AnimatedPressable
                        onPress={() => setMenuVisible(true)}
                        scaleDown={0.9}
                    >
                        <Menu size={24} color={colors.muted} />
                    </AnimatedPressable>
                </XStack>
            </XStack>

            <PopoutMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                items={menuItems}
                anchorX={screenWidth - 220}
                anchorY={HEADER_HEIGHT + 8}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    bellContainer: {
        position: 'relative',
    },
    badgeContainer: {
        position: 'absolute',
        top: -6,
        right: -8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        textAlign: 'center',
    },
});
