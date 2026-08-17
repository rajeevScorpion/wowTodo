import { Image, StyleSheet } from 'react-native';
import { View } from 'tamagui';
import { AppText } from '../ui/AppText';
import { useSemanticColors } from '../../design-system/useSemanticColors';

interface UserAvatarProps {
    avatarUrl: string | null;
    fullName: string | null;
    size?: number;
}

function getInitials(name: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}

export function UserAvatar({ avatarUrl, fullName, size = 36 }: UserAvatarProps) {
    const colors = useSemanticColors();
    const fontSize = size * 0.38;

    if (avatarUrl) {
        return (
            <Image
                source={{ uri: avatarUrl }}
                style={[
                    styles.image,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderColor: colors.hairline,
                    },
                ]}
            />
        );
    }

    return (
        <View
            width={size}
            height={size}
            borderRadius={size / 2}
            backgroundColor={colors.primary}
            alignItems="center"
            justifyContent="center"
        >
            <AppText
                weight="semibold"
                color="#FFFFFF"
                style={{ fontSize, lineHeight: fontSize * 1.3 }}
            >
                {getInitials(fullName)}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    image: {
        borderWidth: 1,
    },
});
