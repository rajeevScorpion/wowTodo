import { XStack, YStack, View } from 'tamagui';
import { AppText } from '../ui/AppText';
import { UserAvatar } from './UserAvatar';
import { Button } from '../ui/Button';
import { useSemanticColors } from '../../design-system/useSemanticColors';
import { EnrichedShare } from '../../features/sharing/api';
import { ShareStatus } from '../../types';

interface ShareRowProps {
    share: EnrichedShare;
    onRevoke?: (shareId: string, taskId: string) => void;
    isRevoking?: boolean;
}

function statusLabel(status: ShareStatus): { text: string; color: string } {
    switch (status) {
        case 'pending':
            return { text: 'Pending', color: 'warning' };
        case 'accepted':
            return { text: 'Accepted', color: 'success' };
        case 'rejected':
            return { text: 'Declined', color: 'error' };
        case 'revoked':
            return { text: 'Revoked', color: 'muted' };
    }
}

export function ShareRow({ share, onRevoke, isRevoking }: ShareRowProps) {
    const colors = useSemanticColors();
    const { text: statusText, color: statusColorKey } = statusLabel(share.status);
    const statusColor = (colors as any)[statusColorKey] || colors.muted;
    const statusBg = (colors as any)[`${statusColorKey}Background`] || colors.cardBackground;

    return (
        <XStack
            alignItems="center"
            gap="$3"
            paddingVertical="$3"
            paddingHorizontal="$4"
            borderBottomWidth={1}
            borderBottomColor={colors.hairline}
        >
            <UserAvatar
                avatarUrl={share.counterpart_avatar}
                fullName={share.counterpart_name}
                size={36}
            />

            <YStack flex={1} gap={2}>
                <AppText weight="medium" numberOfLines={1}>
                    {share.task_title}
                </AppText>
                <XStack alignItems="center" gap="$2">
                    <AppText size="xs" variant="muted">
                        {share.counterpart_name || 'Unknown'}
                    </AppText>
                    <View
                        paddingHorizontal="$1.5"
                        paddingVertical={1}
                        borderRadius="$10"
                        backgroundColor={statusBg}
                    >
                        <AppText size="xs" weight="medium" color={statusColor}>
                            {statusText}
                        </AppText>
                    </View>
                </XStack>
                {share.status === 'rejected' && share.rejection_note && (
                    <AppText size="xs" variant="muted" numberOfLines={2}>
                        Note: {share.rejection_note}
                    </AppText>
                )}
            </YStack>

            {(share.status === 'pending' || share.status === 'accepted') && onRevoke && (
                <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => onRevoke(share.id, share.task_id)}
                    disabled={isRevoking}
                    loading={isRevoking}
                >
                    Revoke
                </Button>
            )}
        </XStack>
    );
}
