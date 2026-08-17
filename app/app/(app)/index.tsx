import { useState, useEffect } from 'react';
import { Platform, StyleSheet, Keyboard } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Mic, Square, X, Sparkles } from 'lucide-react-native';
import { useVoiceRecording } from '../../src/hooks/useVoiceRecording';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { AppText } from '../../src/components/ui/AppText';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { useSemanticColors } from '../../src/design-system/useSemanticColors';
import { AppLanguage } from '../../src/types';

export default function VoiceHomeScreen() {
    const router = useRouter();
    const [language, setLanguage] = useState<AppLanguage>('en');
    const { recordingState, startVoiceRecording, stopVoiceRecording, cancelRecording } = useVoiceRecording(language);
    const colors = useSemanticColors();

    const [showTextInput, setShowTextInput] = useState(false);
    const [textValue, setTextValue] = useState('');

    // Tooltip fade animation
    const tooltipOpacity = useSharedValue(1);
    useEffect(() => {
        tooltipOpacity.value = withDelay(3000, withTiming(0, { duration: 800 }));
    }, []);

    // Pulsing ring animation for recording state
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0);

    useEffect(() => {
        if (recordingState === 'recording') {
            pulseOpacity.value = withTiming(0.4, { duration: 300 });
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) }),
                ),
                -1,
                false,
            );
        } else {
            pulseOpacity.value = withTiming(0, { duration: 200 });
            pulseScale.value = withTiming(1, { duration: 200 });
        }
    }, [recordingState]);

    const tooltipStyle = useAnimatedStyle(() => ({
        opacity: tooltipOpacity.value,
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }));

    const handleMicPress = async () => {
        if (recordingState === 'idle') {
            await startVoiceRecording();
        } else if (recordingState === 'recording') {
            const transcript = await stopVoiceRecording();
            if (transcript) {
                router.push({ pathname: '/(app)/review', params: { text: transcript, source: 'voice', lang: language } });
            }
        }
    };

    const handleLongPress = () => {
        if (recordingState !== 'idle') return;
        setShowTextInput(true);
        setTextValue('');
    };

    const handleTextSubmit = () => {
        if (!textValue.trim()) return;
        Keyboard.dismiss();
        setShowTextInput(false);
        router.push({ pathname: '/(app)/review', params: { text: textValue.trim(), source: 'text', lang: language, autoGenerate: '1' } });
    };

    const handleDismissTextInput = () => {
        Keyboard.dismiss();
        setShowTextInput(false);
        setTextValue('');
    };

    const isProcessing = recordingState === 'processing';

    if (showTextInput) {
        return (
            <YStack flex={1} justifyContent="center" paddingHorizontal="$6" backgroundColor={colors.neoBg}>
                <YStack gap="$3">
                    <Input
                        value={textValue}
                        onChangeText={setTextValue}
                        placeholder="Describe a task..."
                        multiline
                        numberOfLines={5}
                        autoFocus
                        textAlignVertical="top"
                        style={{ height: undefined, minHeight: 120 }}
                    />
                    <XStack justifyContent="flex-end" gap="$2">
                        <Button variant="outline" onPress={handleDismissTextInput} size="sm">
                            <AppText weight="medium" color={colors.primary}>Cancel</AppText>
                        </Button>
                        <Button
                            onPress={handleTextSubmit}
                            disabled={!textValue.trim()}
                            size="sm"
                        >
                            <XStack alignItems="center" gap="$1.5">
                                <Sparkles size={14} color="white" />
                                <AppText weight="medium" color="white">Create Task</AppText>
                            </XStack>
                        </Button>
                    </XStack>
                </YStack>
            </YStack>
        );
    }

    return (
        <YStack flex={1} alignItems="center" justifyContent="flex-start" gap="$6" backgroundColor={colors.neoBg}>
            {/* Mic button area */}
            <YStack style={{ position: 'absolute', top: '50%' }} alignItems="center" gap="$4">
                {/* Pulsing ring behind mic */}
                <Animated.View style={[styles.pulseRing, pulseStyle, { backgroundColor: colors.error }]} />

                {/* Mic button */}
                <AnimatedPressable
                    onPress={handleMicPress}
                    onLongPress={handleLongPress}
                    delayLongPress={500}
                    disabled={isProcessing}
                    scaleDown={0.93}
                    style={[
                        styles.micButton,
                        { backgroundColor: colors.primary },
                        recordingState === 'recording' && { backgroundColor: colors.error },
                        isProcessing && styles.micButtonProcessing,
                    ]}
                >
                    {recordingState === 'recording' ? (
                        <Square color="white" size={32} fill="white" />
                    ) : (
                        <Mic color="white" size={36} />
                    )}
                </AnimatedPressable>

                {/* Tooltip */}
                <Animated.View style={tooltipStyle}>
                    <AppText variant="muted" textAlign="center" size="md">
                        Tap once to record{'\n'}Tap and hold for typing
                    </AppText>
                </Animated.View>

                {/* Language toggle */}
                {recordingState === 'idle' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onPress={() => setLanguage(prev => prev === 'en' ? 'hi' : 'en')}
                        style={{ paddingHorizontal: 12 }}
                    >
                        <AppText weight="medium" size="sm">
                            {language === 'en' ? 'EN' : 'हिं'}
                        </AppText>
                    </Button>
                )}

                {/* Processing indicator */}
                {isProcessing && (
                    <AppText variant="muted" size="md">
                        {language === 'hi' ? 'लिख रहे हैं...' : 'Transcribing...'}
                    </AppText>
                )}

                {/* Cancel button during recording */}
                {recordingState === 'recording' && (
                    <Button variant="ghost" onPress={cancelRecording} size="sm">
                        <XStack alignItems="center" gap="$1">
                            <X size={16} color={colors.muted} />
                            <AppText variant="muted" size="sm">Cancel</AppText>
                        </XStack>
                    </Button>
                )}
            </YStack>
        </YStack>
    );
}

const MIC_SIZE = 120;

const styles = StyleSheet.create({
    micButton: {
        width: MIC_SIZE,
        height: MIC_SIZE,
        borderRadius: MIC_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.10,
                shadowRadius: 18,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    micButtonProcessing: {
        opacity: 0.6,
    },
    pulseRing: {
        position: 'absolute',
        width: MIC_SIZE,
        height: MIC_SIZE,
        borderRadius: MIC_SIZE / 2,
        zIndex: 1,
    },
});
