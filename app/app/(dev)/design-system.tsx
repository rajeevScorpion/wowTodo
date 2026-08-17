import { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { YStack, XStack, View } from 'tamagui';
import { GradientHeader } from '../../src/components/ui/GradientHeader';
import { Heading } from '../../src/components/ui/Heading';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Divider } from '../../src/components/ui/Divider';
import { CactusIcon } from '../../src/components/ui/CactusIcon';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <YStack gap="$3" marginBottom="$6">
            <Heading level={3}>
                {title}
            </Heading>
            <Divider />
            {children}
        </YStack>
    );
}

function SwipeableCardDemo() {
    const colors = useSemanticColors();
    const translateX = useSharedValue(0);

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = e.translationX;
        })
        .onEnd(() => {
            translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={animatedStyle}>
                <Card padded elevated>
                    <XStack alignItems="center" gap="$3">
                        <CactusIcon size={32} color={colors.primary} />
                        <YStack flex={1}>
                            <AppText weight="medium">Swipe me!</AppText>
                            <AppText size="sm" variant="muted">
                                Drag horizontally — I'll spring back
                            </AppText>
                        </YStack>
                    </XStack>
                </Card>
            </Animated.View>
        </GestureDetector>
    );
}

export default function DesignSystemScreen() {
    const [inputValue, setInputValue] = useState('');
    const [tapCount, setTapCount] = useState(0);
    const colors = useSemanticColors();

    return (
        <>
            <Stack.Screen options={{ title: 'Design System' }} />
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView
                    style={{ flex: 1, backgroundColor: colors.background }}
                    edges={['left', 'right']}
                >
                    <ScrollView
                        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* 1. Gradient Header */}
                        <YStack marginBottom="$6">
                            <GradientHeader
                                title="Cactus Design System"
                                subtitle="All tokens, themes, and components in one place"
                            />
                        </YStack>

                        {/* 2. Typography */}
                        <Section title="Typography">
                            <YStack gap="$2">
                                <Heading level={1}>Heading Level 1</Heading>
                                <Heading level={2}>Heading Level 2</Heading>
                                <Heading level={3}>Heading Level 3</Heading>
                                <Heading level={4}>Heading Level 4</Heading>
                            </YStack>
                            <YStack gap="$2" marginTop="$4">
                                <AppText size="xl" weight="bold">AppText XL Bold</AppText>
                                <AppText size="lg">AppText LG (default)</AppText>
                                <AppText size="md">AppText MD</AppText>
                                <AppText size="sm">AppText SM</AppText>
                                <AppText size="xs">AppText XS</AppText>
                            </YStack>
                            <YStack gap="$2" marginTop="$4">
                                <AppText variant="default">Default variant</AppText>
                                <AppText variant="muted">Muted variant</AppText>
                                <AppText variant="secondary">Secondary variant</AppText>
                                <AppText variant="error">Error variant</AppText>
                            </YStack>
                        </Section>

                        {/* 3. Color Palette */}
                        <Section title="Color Palette">
                            <AppText size="sm" variant="muted" marginBottom="$2">
                                Theme Colors
                            </AppText>
                            <XStack gap="$2" flexWrap="wrap">
                                {[
                                    { label: 'Primary', color: colors.primary },
                                    { label: 'Background', color: colors.background },
                                    { label: 'Card', color: colors.cardBackground },
                                    { label: 'Border', color: colors.borderColor },
                                    { label: 'Muted', color: colors.muted },
                                ].map((c) => (
                                    <YStack key={c.label} alignItems="center" gap="$1">
                                        <View
                                            width={48}
                                            height={48}
                                            borderRadius="$3"
                                            backgroundColor={c.color}
                                            borderWidth={1}
                                            borderColor={colors.borderColor}
                                        />
                                        <AppText size="xs" variant="muted">{c.label}</AppText>
                                    </YStack>
                                ))}
                            </XStack>
                            <AppText size="sm" variant="muted" marginTop="$4" marginBottom="$2">
                                Semantic
                            </AppText>
                            <XStack gap="$2" flexWrap="wrap">
                                {[
                                    { label: 'Error', color: colors.error },
                                    { label: 'Warning', color: colors.warning },
                                    { label: 'Info', color: colors.info },
                                    { label: 'Success', color: colors.success },
                                ].map((c) => (
                                    <YStack key={c.label} alignItems="center" gap="$1">
                                        <View
                                            width={48}
                                            height={48}
                                            borderRadius="$3"
                                            backgroundColor={c.color}
                                        />
                                        <AppText size="xs" variant="muted">{c.label}</AppText>
                                    </YStack>
                                ))}
                            </XStack>
                        </Section>

                        {/* 4. Buttons */}
                        <Section title="Buttons">
                            <AppText size="sm" variant="muted" marginBottom="$2">Variants</AppText>
                            <YStack gap="$3">
                                <Button variant="primary" onPress={() => Alert.alert('Primary')}>
                                    Primary Button
                                </Button>
                                <Button variant="outline" onPress={() => Alert.alert('Outline')}>
                                    Outline Button
                                </Button>
                                <Button variant="ghost" onPress={() => Alert.alert('Ghost')}>
                                    Ghost Button
                                </Button>
                                <Button variant="destructive" onPress={() => Alert.alert('Destructive')}>
                                    Destructive Button
                                </Button>
                            </YStack>
                            <AppText size="sm" variant="muted" marginTop="$4" marginBottom="$2">Sizes</AppText>
                            <YStack gap="$3">
                                <Button size="sm" onPress={() => {}}>Small</Button>
                                <Button size="md" onPress={() => {}}>Medium</Button>
                                <Button size="lg" onPress={() => {}}>Large</Button>
                            </YStack>
                            <AppText size="sm" variant="muted" marginTop="$4" marginBottom="$2">States</AppText>
                            <YStack gap="$3">
                                <Button loading>Loading</Button>
                                <Button disabled>Disabled</Button>
                                <Button fullWidth>Full Width</Button>
                            </YStack>
                        </Section>

                        {/* 5. Input */}
                        <Section title="Input">
                            <YStack gap="$4">
                                <Input
                                    label="Normal Input"
                                    placeholder="Type something..."
                                    value={inputValue}
                                    onChangeText={setInputValue}
                                />
                                <Input
                                    label="With Error"
                                    placeholder="Invalid input"
                                    value="bad value"
                                    error="This field is invalid"
                                />
                                <Input
                                    label="Disabled"
                                    placeholder="Can't edit this"
                                    editable={false}
                                    value="Read only content"
                                />
                            </YStack>
                        </Section>

                        {/* 6. Cards */}
                        <Section title="Cards">
                            <Card padded elevated marginBottom="$3">
                                <AppText weight="medium">Elevated Card (default)</AppText>
                                <AppText size="sm" variant="muted" marginTop="$1">
                                    With shadow and padding
                                </AppText>
                            </Card>
                            <Card padded elevated={false} marginBottom="$3">
                                <AppText weight="medium">Flat Card</AppText>
                                <AppText size="sm" variant="muted" marginTop="$1">
                                    No shadow, border only
                                </AppText>
                            </Card>
                            <Card marginBottom="$3">
                                <CardHeader>
                                    <CardTitle>Structured Card</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <AppText size="md" variant="secondary">
                                        Using CardHeader, CardContent, and CardFooter sub-components.
                                    </AppText>
                                </CardContent>
                                <CardFooter>
                                    <Button size="sm" variant="outline" onPress={() => {}}>
                                        Action
                                    </Button>
                                </CardFooter>
                            </Card>
                        </Section>

                        {/* 7. Cactus Icon */}
                        <Section title="Cactus Icon">
                            <XStack gap="$4" alignItems="flex-end">
                                {[16, 24, 32, 48, 64].map((size) => (
                                    <YStack key={size} alignItems="center" gap="$1">
                                        <CactusIcon size={size} />
                                        <AppText size="xs" variant="muted">{size}px</AppText>
                                    </YStack>
                                ))}
                            </XStack>
                            <XStack gap="$4" marginTop="$4" alignItems="center">
                                <CactusIcon size={32} color={colors.primary} />
                                <CactusIcon size={32} color={colors.background} />
                                <CactusIcon size={32} color={colors.muted} />
                                <CactusIcon size={32} color={colors.error} />
                            </XStack>
                        </Section>

                        {/* 8. AnimatedPressable */}
                        <Section title="AnimatedPressable">
                            <AnimatedPressable
                                onPress={() => setTapCount((c) => c + 1)}
                            >
                                <Card padded elevated>
                                    <XStack alignItems="center" justifyContent="space-between">
                                        <YStack>
                                            <AppText weight="medium">Tap me!</AppText>
                                            <AppText size="sm" variant="muted">
                                                Press to see spring scale animation
                                            </AppText>
                                        </YStack>
                                        <View
                                            backgroundColor={colors.primary}
                                            borderRadius="$10"
                                            width={36}
                                            height={36}
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            <AppText weight="bold" color={'white'}>
                                                {tapCount}
                                            </AppText>
                                        </View>
                                    </XStack>
                                </Card>
                            </AnimatedPressable>
                        </Section>

                        {/* 9. Swipeable Card (Gesture Demo) */}
                        <Section title="Gesture Demo">
                            <SwipeableCardDemo />
                        </Section>

                        {/* 10. Divider */}
                        <Section title="Dividers">
                            <YStack gap="$3">
                                <AppText size="sm">Horizontal divider:</AppText>
                                <Divider />
                                <XStack height={60} gap="$3" alignItems="center">
                                    <AppText size="sm">Left</AppText>
                                    <Divider vertical />
                                    <AppText size="sm">Right</AppText>
                                </XStack>
                            </YStack>
                        </Section>

                        {/* 11. Spacing Scale */}
                        <Section title="Spacing Scale">
                            <YStack gap="$2">
                                {[1, 2, 3, 4, 5, 6, 8, 10].map((s) => (
                                    <XStack key={s} alignItems="center" gap="$3">
                                        <AppText size="xs" variant="muted" width={30}>
                                            ${s}
                                        </AppText>
                                        <View
                                            height={12}
                                            backgroundColor={colors.success}
                                            borderRadius="$1"
                                            style={{ width: s * 8 }}
                                        />
                                    </XStack>
                                ))}
                            </YStack>
                        </Section>
                    </ScrollView>
                </SafeAreaView>
            </GestureHandlerRootView>
        </>
    );
}
