import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { Button } from './ui/Button';
import { AppText } from './ui/AppText';
import { Mic, X } from 'lucide-react-native';
import { RecordingState, AppLanguage } from '../types';
import { useSemanticColors } from '../design-system/useSemanticColors';

interface VoiceInputProps {
    recordingState: RecordingState;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onCancelRecording?: () => void;
    language?: AppLanguage;
}

export function VoiceInput({
    recordingState,
    onStartRecording,
    onStopRecording,
    onCancelRecording,
    language,
}: VoiceInputProps) {
    const colors = useSemanticColors();
    const micOpacity = useSharedValue(1);

    useEffect(() => {
        if (recordingState === 'recording') {
            micOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                ),
                -1,
                false,
            );
        } else {
            cancelAnimation(micOpacity);
            micOpacity.value = 1;
        }
    }, [recordingState]);

    const blinkStyle = useAnimatedStyle(() => ({
        opacity: micOpacity.value,
    }));

    if (recordingState === 'processing') {
        return (
            <YStack alignItems="center" justifyContent="center" paddingVertical="$2" paddingHorizontal="$3">
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText size="xs" variant="muted" marginTop="$1">
                    {language === 'hi' ? 'लिख रहे हैं...' : 'Transcribing...'}
                </AppText>
            </YStack>
        );
    }

    if (recordingState === 'recording') {
        return (
            <XStack alignItems="center" gap="$2">
                {onCancelRecording && (
                    <Button
                        onPress={onCancelRecording}
                        variant="ghost"
                        size="md"
                        style={{ paddingHorizontal: 10 }}
                    >
                        <X size={18} color={colors.muted} />
                    </Button>
                )}
                <Button
                    onPress={onStopRecording}
                    variant="destructive"
                    size="md"
                    style={{ paddingHorizontal: 12 }}
                >
                    <XStack alignItems="center" gap="$2">
                        <Animated.View style={blinkStyle}>
                            <Mic size={18} color="white" />
                        </Animated.View>
                    </XStack>
                </Button>
            </XStack>
        );
    }

    return (
        <Button
            onPress={onStartRecording}
            variant="outline"
            size="md"
            style={{ paddingHorizontal: 12 }}
        >
            <Mic size={20} color={colors.color} />
        </Button>
    );
}
