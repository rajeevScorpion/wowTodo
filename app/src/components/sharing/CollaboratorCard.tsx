import { TouchableOpacity, StyleSheet } from 'react-native';
import { XStack, YStack, View } from 'tamagui';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { NeoCard } from '../neo/NeoCard';
import { AppText } from '../ui/AppText';
import { UserAvatar } from './UserAvatar';
import { useSemanticColors } from '../../design-system/useSemanticColors';

export interface CollaboratorData {
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
    tasksDue: number;
    tasksCompleted: number;
    tasksTotal: number;
    todosDue: number;
    todosCompleted: number;
    todosTotal: number;
}

interface CollaboratorCardProps {
    collaborator: CollaboratorData;
    onPress: (userId: string) => void;
}

const RING_SIZE = 65;
const STROKE_WIDTH = 3;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = RING_SIZE / 2;

function ProgressRing({
    label,
    completed,
    total,
    colors,
}: {
    label: string;
    completed: number;
    total: number;
    colors: ReturnType<typeof useSemanticColors>;
}) {
    const percent = total > 0 ? (completed / total) * 100 : 0;
    const offset = CIRCUMFERENCE * (1 - percent / 100);
    const isComplete = total > 0 && completed === total;
    const progressColor = isComplete ? colors.success : colors.neoAccentGold;

    return (
        <View style={styles.ringContainer}>
            <Svg
                width={RING_SIZE}
                height={RING_SIZE}
                style={styles.svgRotated}
            >
                <SvgCircle
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    stroke={colors.neoInset}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                />
                {total > 0 && (
                    <SvgCircle
                        cx={CENTER}
                        cy={CENTER}
                        r={RADIUS}
                        stroke={progressColor}
                        strokeWidth={STROKE_WIDTH}
                        fill="none"
                        strokeDasharray={`${CIRCUMFERENCE}`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                )}
            </Svg>
            <View style={styles.ringLabel}>
                <AppText
                    style={{ fontSize: 9, lineHeight: 12 }}
                    variant="muted"
                >
                    {label}
                </AppText>
                <AppText
                    style={{ fontSize: 10, lineHeight: 13 }}
                    weight="semibold"
                >
                    {completed}/{total}
                </AppText>
            </View>
        </View>
    );
}

export function CollaboratorCard({ collaborator, onPress }: CollaboratorCardProps) {
    const colors = useSemanticColors();

    return (
        <TouchableOpacity onPress={() => onPress(collaborator.userId)} activeOpacity={0.7}>
            <NeoCard marginBottom="$3">
                <XStack alignItems="center" gap="$3">
                    <UserAvatar
                        avatarUrl={collaborator.avatarUrl}
                        fullName={collaborator.fullName}
                        size={40}
                    />
                    <YStack flex={1}>
                        <AppText weight="medium">
                            {collaborator.fullName || 'Unknown'}
                        </AppText>
                        <AppText size="xs" variant="muted">
                            {collaborator.tasksTotal} shared task{collaborator.tasksTotal !== 1 ? 's' : ''}
                            {'  '}
                            {collaborator.tasksDue} due
                        </AppText>
                    </YStack>
                    <XStack gap="$4">
                        <ProgressRing
                            label="Tasks"
                            completed={collaborator.tasksCompleted}
                            total={collaborator.tasksTotal}
                            colors={colors}
                        />
                        <ProgressRing
                            label="Todos"
                            completed={collaborator.todosCompleted}
                            total={collaborator.todosTotal}
                            colors={colors}
                        />
                    </XStack>
                </XStack>
            </NeoCard>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    ringContainer: {
        width: RING_SIZE,
        height: RING_SIZE,
        position: 'relative',
    },
    svgRotated: {
        transform: [{ rotate: '-90deg' }],
    },
    ringLabel: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
