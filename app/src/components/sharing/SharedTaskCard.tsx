import { TouchableOpacity } from 'react-native';
import { XStack, YStack, View } from 'tamagui';
import { Card } from '../ui/Card';
import { AppText } from '../ui/AppText';
import { UserAvatar } from './UserAvatar';
import { useSemanticColors } from '../../design-system/useSemanticColors';
import { EnrichedShare } from '../../features/sharing/api';

function formatSharedDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface SharedTaskCardProps {
    share: EnrichedShare;
    onPress: (taskId: string) => void;
    isPending?: boolean;
}

export function SharedTaskCard({ share, onPress, isPending }: SharedTaskCardProps) {
    const colors = useSemanticColors();
    const progressPercent =
        share.total_count > 0
            ? Math.round((share.completed_count / share.total_count) * 100)
            : 0;
    const isComplete =
        share.total_count > 0 && share.completed_count === share.total_count;

    return (
        <TouchableOpacity
            onPress={() => onPress(share.task_id)}
            activeOpacity={0.7}
            style={{ opacity: isPending ? 0.5 : 1 }}
        >
            <Card marginBottom="$3" padding="$4">
                <YStack gap="$2">
                    <AppText
                        weight="medium"
                        color={isComplete ? colors.muted : colors.color}
                        numberOfLines={2}
                    >
                        {share.task_title}
                    </AppText>

                    {/* Progress bar (only for accepted shares) */}
                    {!isPending && (
                        <XStack alignItems="center" gap="$2">
                            <View
                                flex={1}
                                height={8}
                                backgroundColor={colors.neoInset}
                                borderRadius="$10"
                                overflow="hidden"
                            >
                                <View
                                    style={{
                                        width: `${progressPercent}%`,
                                        height: '100%',
                                        backgroundColor: isComplete
                                            ? colors.success
                                            : colors.primary,
                                        borderRadius: 9999,
                                    }}
                                />
                            </View>
                            <AppText size="xs" variant="muted">
                                {share.completed_count}/{share.total_count}
                            </AppText>
                        </XStack>
                    )}

                    {/* Shared by info */}
                    <XStack alignItems="center" gap="$2" marginTop="$1" flexWrap="wrap">
                        <UserAvatar
                            avatarUrl={share.counterpart_avatar}
                            fullName={share.counterpart_name}
                            size={20}
                        />
                        <AppText size="xs" variant="muted">
                            {share.counterpart_name || 'Unknown'}
                        </AppText>
                        {share.created_at && (
                            <AppText size="xs" variant="muted">
                                {formatSharedDate(share.created_at)}
                            </AppText>
                        )}
                        {isPending && (
                            <View
                                paddingHorizontal="$2"
                                paddingVertical="$0.5"
                                borderRadius="$10"
                                backgroundColor={colors.warningBackground}
                            >
                                <AppText size="xs" weight="medium" color={colors.warning}>
                                    Pending
                                </AppText>
                            </View>
                        )}
                    </XStack>
                </YStack>
            </Card>
        </TouchableOpacity>
    );
}
