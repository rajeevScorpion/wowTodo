import { TouchableOpacity } from 'react-native';
import { XStack, YStack, View } from 'tamagui';
import { Share2, Check, X } from 'lucide-react-native';
import { AppText } from '../ui/AppText';
import { useSemanticColors } from '../../design-system/useSemanticColors';
import { InAppNotification, InAppNotificationType } from '../../types';

interface NotificationRowProps {
    notification: InAppNotification;
    onPress?: (notification: InAppNotification) => void;
}

function getIcon(type: InAppNotificationType, colors: any) {
    switch (type) {
        case 'share_received':
            return <Share2 size={16} color={colors.primary} />;
        case 'share_accepted':
            return <Check size={16} color={colors.success} />;
        case 'share_rejected':
            return <X size={16} color={colors.error} />;
    }
}

function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
    const colors = useSemanticColors();

    return (
        <TouchableOpacity
            onPress={() => onPress?.(notification)}
            activeOpacity={0.7}
        >
            <XStack
                alignItems="center"
                gap="$3"
                paddingVertical="$3"
                paddingHorizontal="$4"
                borderBottomWidth={1}
                borderBottomColor={colors.hairline}
                backgroundColor={notification.read ? undefined : colors.infoBackground}
            >
                {/* Unread dot */}
                <View
                    width={8}
                    height={8}
                    borderRadius={4}
                    backgroundColor={notification.read ? 'transparent' : colors.primary}
                />

                {/* Icon */}
                <View
                    width={32}
                    height={32}
                    borderRadius={16}
                    backgroundColor={colors.cardBackground}
                    alignItems="center"
                    justifyContent="center"
                >
                    {getIcon(notification.type, colors)}
                </View>

                {/* Content */}
                <YStack flex={1} gap={2}>
                    <AppText
                        size="sm"
                        weight={notification.read ? 'regular' : 'medium'}
                        numberOfLines={2}
                    >
                        {notification.body}
                    </AppText>
                    <AppText size="xs" variant="muted">
                        {timeAgo(notification.created_at)}
                    </AppText>
                </YStack>
            </XStack>
        </TouchableOpacity>
    );
}
