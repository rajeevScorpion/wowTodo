import { useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Settings, Mic, CheckSquare, Share2, Users } from 'lucide-react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { useSemanticColors } from '../../design-system/useSemanticColors';

const BAR_HEIGHT = 56;
const MIC_SIZE = 56;
const RING_SIZE = MIC_SIZE + 14;

export function BottomBar() {
    const colors = useSemanticColors();
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const [micCenterX, setMicCenterX] = useState<number | null>(null);
    const isTasks = pathname.startsWith('/tasks') || pathname.startsWith('/(app)/tasks');
    const isSettings = pathname.startsWith('/settings') || pathname.startsWith('/(app)/settings');
    const isShared = pathname.startsWith('/shared') || pathname.startsWith('/(app)/shared');
    const isPeople = pathname.startsWith('/people') || pathname.startsWith('/(app)/people');

    const iconColor = (active: boolean) => active ? colors.primary : colors.muted;

    const handleMicSlotLayout = (e: LayoutChangeEvent) => {
        const { x, width } = e.nativeEvent.layout;
        setMicCenterX(x + width / 2);
    };

    return (
        <View style={{
            backgroundColor: colors.neoSurface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.hairline,
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 14,
                },
                android: {
                    elevation: 8,
                },
            }),
            zIndex: 10,
        }}>
            <View style={styles.barContainer}>
                {/* Elevated mic — always mounted to avoid Fabric crash, hidden via opacity until measured */}
                <View
                    style={[
                        styles.micWrapper,
                        {
                            left: micCenterX !== null ? micCenterX - RING_SIZE / 2 : 0,
                            opacity: micCenterX !== null ? 1 : 0,
                        },
                    ]}
                >
                    <View style={[styles.micRing, { borderColor: colors.hairline, backgroundColor: colors.neoInset }]}>
                        <AnimatedPressable
                            onPress={() => router.navigate('/(app)/' as any)}
                            scaleDown={0.9}
                            style={[
                                styles.micButton,
                                { shadowColor: '#000', backgroundColor: colors.neoSurface },
                            ]}
                        >
                            <Mic color={colors.color} size={26} />
                        </AnimatedPressable>
                    </View>
                </View>

                {/* Bar with 5 equal slots */}
                <View
                    style={[
                        styles.bar,
                        {
                            backgroundColor: colors.neoSurface,
                            borderTopColor: colors.hairline,
                        },
                    ]}
                >
                    {/* Slot 1: Settings */}
                    <AnimatedPressable
                        onPress={() => router.push('/(app)/settings')}
                        style={styles.navItem}
                        scaleDown={0.9}
                    >
                        <Settings size={24} color={iconColor(isSettings)} />
                    </AnimatedPressable>

                    {/* Slot 2: Mic placeholder (empty, mic floats above) */}
                    <View style={styles.navItem} onLayout={handleMicSlotLayout} />

                    {/* Slot 3: Tasks */}
                    <AnimatedPressable
                        onPress={() => router.push('/(app)/tasks')}
                        style={styles.navItem}
                        scaleDown={0.9}
                    >
                        <CheckSquare size={24} color={iconColor(isTasks)} />
                    </AnimatedPressable>

                    {/* Slot 4: Shared */}
                    <AnimatedPressable
                        onPress={() => router.push('/(app)/shared' as any)}
                        style={styles.navItem}
                        scaleDown={0.9}
                    >
                        <Share2 size={24} color={iconColor(isShared)} />
                    </AnimatedPressable>

                    {/* Slot 5: People */}
                    <AnimatedPressable
                        onPress={() => router.push('/(app)/people' as any)}
                        style={styles.navItem}
                        scaleDown={0.9}
                    >
                        <Users size={24} color={iconColor(isPeople)} />
                    </AnimatedPressable>
                </View>
            </View>

            {/* Safe area bottom fill */}
            <View
                style={{
                    height: insets.bottom,
                    backgroundColor: colors.neoSurface,
                }}
            />

        </View>
    );
}

const styles = StyleSheet.create({
    barContainer: {
        position: 'relative',
    },
    micWrapper: {
        position: 'absolute',
        top: -(RING_SIZE / 2),
        zIndex: 10,
    },
    micRing: {
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micButton: {
        width: MIC_SIZE,
        height: MIC_SIZE,
        borderRadius: MIC_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    bar: {
        height: BAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 8,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: BAR_HEIGHT,
    },
    placeholderItem: {
        opacity: 0.4,
    },
});
