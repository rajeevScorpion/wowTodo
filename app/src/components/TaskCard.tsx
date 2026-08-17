import React, { useRef, useState } from 'react';
import { TouchableOpacity, Dimensions, View as RNView } from 'react-native';
import { XStack, YStack, View } from 'tamagui';
import { Card } from './ui/Card';
import { AppText } from './ui/AppText';
import { PopoutMenu, MenuItem } from './ui/PopoutMenu';
import { MoreVertical, Share2, Trash2, GitBranch } from 'lucide-react-native';
import { TaskWithProgress } from '../types';
import { useSemanticColors } from '../design-system/useSemanticColors';
import { UserAvatar } from './sharing/UserAvatar';

export interface SharedUser {
    name: string | null;
    avatar: string | null;
}

interface TaskCardProps {
    task: TaskWithProgress;
    groupName?: string;
    sharedWith?: SharedUser[];
    onPress: (taskId: string) => void;
    onDelete: (taskId: string) => void;
    onViewBranches?: (taskId: string) => void;
    onShareTask?: (taskId: string) => void;
    isDeleting?: boolean;
}

// UPDATE THIS COMPARATOR if TaskCardProps changes
export const TaskCard = React.memo(function TaskCard({ task, groupName, sharedWith, onPress, onDelete, onViewBranches, onShareTask, isDeleting }: TaskCardProps) {
    const colors = useSemanticColors();
    const menuButtonRef = useRef<RNView>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState({ x: 0, anchorBottom: 0 });

    const progressPercent =
        task.total_count > 0
            ? Math.round((task.completed_count / task.total_count) * 100)
            : 0;

    const isComplete =
        task.total_count > 0 && task.completed_count === task.total_count;

    const hasBranches = task.todos?.some(t => t.is_branched) ?? false;

    const handleMenuPress = () => {
        menuButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
            const screenHeight = Dimensions.get('window').height;
            const bottomDistance = screenHeight - pageY;
            setMenuAnchor({ x: pageX - 160, anchorBottom: bottomDistance + height + 4 });
            setShowMenu(true);
        });
    };

    const menuItems: MenuItem[] = [
        {
            icon: <Share2 size={18} color={colors.primary} />,
            label: 'Share',
            onPress: () => onShareTask?.(task.id),
        },
        {
            icon: <Trash2 size={18} color={colors.error} />,
            label: 'Delete',
            onPress: () => onDelete(task.id),
            disabled: isDeleting,
        },
    ];

    return (
        <TouchableOpacity onPress={() => onPress(task.id)} activeOpacity={0.7}>
            <Card marginBottom="$3" padding="$4">
                <XStack alignItems="center" justifyContent="space-between">
                    <YStack flex={1} marginRight="$3">
                        <AppText
                            weight="medium"
                            color={isComplete ? colors.muted : colors.color}
                            numberOfLines={2}
                        >
                            {task.title}
                        </AppText>

                        {/* Progress bar */}
                        <XStack alignItems="center" marginTop="$2" gap="$2">
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
                                {task.completed_count}/{task.total_count}
                            </AppText>
                        </XStack>

                        {/* Badges + timestamp + shared avatars */}
                        <XStack alignItems="center" marginTop="$2" gap="$2" flexWrap="wrap">
                            {groupName && (
                                <View
                                    paddingHorizontal="$2"
                                    paddingVertical="$0.5"
                                    borderRadius="$10"
                                    backgroundColor={colors.successBackground}
                                >
                                    <AppText size="xs" weight="medium" color={colors.color}>
                                        {groupName}
                                    </AppText>
                                </View>
                            )}
                            <AppText size="xs" variant="muted">
                                {new Date(task.created_at).toLocaleDateString()}
                            </AppText>
                            {sharedWith && sharedWith.length > 0 && (
                                <XStack alignItems="center">
                                    {sharedWith.slice(0, 5).map((person, index) => (
                                        <View
                                            key={index}
                                            style={{
                                                marginLeft: index === 0 ? 0 : -8,
                                                borderRadius: 11,
                                                borderWidth: 2,
                                                borderColor: colors.neoSurface,
                                                zIndex: 5 - index,
                                            }}
                                        >
                                            <UserAvatar
                                                avatarUrl={person.avatar}
                                                fullName={person.name}
                                                size={18}
                                            />
                                        </View>
                                    ))}
                                    {sharedWith.length > 5 && (
                                        <View
                                            style={{
                                                marginLeft: -6,
                                                backgroundColor: colors.neoInset,
                                                borderRadius: 11,
                                                borderWidth: 2,
                                                borderColor: colors.neoSurface,
                                                width: 22,
                                                height: 22,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 0,
                                            }}
                                        >
                                            <AppText size="xs" weight="medium" color={colors.muted} style={{ fontSize: 9 }}>
                                                +{sharedWith.length - 5}
                                            </AppText>
                                        </View>
                                    )}
                                </XStack>
                            )}
                            {hasBranches && (
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onViewBranches?.(task.id);
                                    }}
                                    activeOpacity={0.6}
                                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                >
                                    <XStack
                                        alignItems="center"
                                        gap={4}
                                        paddingHorizontal={8}
                                        paddingVertical={2}
                                        borderRadius={999}
                                        backgroundColor={colors.infoBackground}
                                    >
                                        <GitBranch size={10} color={colors.primary} />
                                        <AppText size="xs" weight="medium" color={colors.primary}>
                                            Branches
                                        </AppText>
                                    </XStack>
                                </TouchableOpacity>
                            )}
                        </XStack>
                    </YStack>

                    <RNView ref={menuButtonRef} collapsable={false}>
                        <TouchableOpacity
                            onPress={handleMenuPress}
                            activeOpacity={0.6}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ height: 32, width: 32, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <MoreVertical size={18} color={colors.muted} />
                        </TouchableOpacity>
                    </RNView>
                </XStack>
            </Card>

            <PopoutMenu
                visible={showMenu}
                onClose={() => setShowMenu(false)}
                items={menuItems}
                anchorX={menuAnchor.x}
                anchorBottom={menuAnchor.anchorBottom}
            />
        </TouchableOpacity>
    );
}, (prev, next) => {
    // Shallow compare sharedWith arrays
    const prevShared = prev.sharedWith;
    const nextShared = next.sharedWith;
    const sharedEqual =
        prevShared === nextShared ||
        (prevShared?.length === nextShared?.length &&
            (prevShared?.every((p, i) => p.name === nextShared![i].name && p.avatar === nextShared![i].avatar) ?? true));

    return (
        prev.task.id === next.task.id &&
        prev.task.title === next.task.title &&
        prev.task.total_count === next.task.total_count &&
        prev.task.completed_count === next.task.completed_count &&
        prev.task.group_id === next.task.group_id &&
        prev.task.source_type === next.task.source_type &&
        prev.groupName === next.groupName &&
        prev.isDeleting === next.isDeleting &&
        sharedEqual
    );
});
