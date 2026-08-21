import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { YStack, XStack } from 'tamagui';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { useSemanticColors } from '../design-system/useSemanticColors';
import { agentStatusLine, agentStatusProgress, type PipelineStage } from '../services/ai/agentStatus';
import { AppLanguage } from '../types';

/**
 * The progressive status line shown while a spoken task is being planned.
 *
 * This replaces the transcript-review screen, which was doing more work than it
 * looked like: the user read their own words back while nothing happened, and
 * the wait was hidden behind their reading. Remove it and the gap from "stopped
 * speaking" to "task appears" is bare — Whisper, then the router, then the
 * specialist. Something has to fill it honestly.
 *
 * So every line here names what is actually happening, and the topic from the
 * router is what makes it about the user's task rather than about our plumbing.
 * When the stream degrades or the topic is missing, the wording falls back to
 * the generic phrasing — never to an invented one.
 */

interface AgentStatusProps {
    stage: PipelineStage;
    language: AppLanguage;
}

export function AgentStatus({ stage, language }: AgentStatusProps) {
    const colors = useSemanticColors();
    const line = agentStatusLine(stage, language);
    const target = agentStatusProgress(stage);

    const progress = useSharedValue(0);
    const textOpacity = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming(target, { duration: 450, easing: Easing.out(Easing.cubic) });
    }, [target]);

    // Re-run on the rendered text rather than on the stage object: `building`
    // fires once per step, and a fade on every one of those would flicker. The
    // line only changes when the count does, which is exactly when a fade helps.
    useEffect(() => {
        textOpacity.value = 0;
        textOpacity.value = withTiming(1, { duration: 220 });
    }, [line]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));

    return (
        <YStack alignItems="center" gap="$3" width="100%" paddingHorizontal="$4">
            <XStack alignItems="center" gap="$2">
                <Sparkles size={16} color={colors.primary} />
                <Animated.View style={textStyle}>
                    <AppText
                        size="md"
                        weight="medium"
                        textAlign="center"
                        color={colors.color}
                        // The line is model-influenced text of unknown length;
                        // cap it so the layout cannot be pushed around.
                        numberOfLines={2}
                    >
                        {line}
                    </AppText>
                </Animated.View>
            </XStack>

            <YStack
                style={[styles.track, { backgroundColor: colors.borderColor }]}
                accessible={false}
            >
                <Animated.View style={[styles.fill, barStyle, { backgroundColor: colors.primary }]} />
            </YStack>
        </YStack>
    );
}

const styles = StyleSheet.create({
    track: {
        width: '100%',
        maxWidth: 260,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 2,
    },
});
