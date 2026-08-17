import { useTheme } from '../../../app/_layout';
import { XStack } from 'tamagui';
import { useSemanticColors } from '../../design-system/useSemanticColors';
import { Sun, Moon } from 'lucide-react-native';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const tamaguiTheme = useSemanticColors();

    const isDark = theme === 'dark';

    return (
        <XStack
            alignItems="center"
            justifyContent="center"
            width={44}
            height={44}
            borderRadius="$3"
            backgroundColor="$backgroundHover"
            pressStyle={{
                backgroundColor: '$backgroundPress',
            }}
            onPress={toggleTheme}
        >
            {isDark ? (
                <Sun size={22} color={tamaguiTheme.color} />
            ) : (
                <Moon size={22} color={tamaguiTheme.color} />
            )}
        </XStack>
    );
}
