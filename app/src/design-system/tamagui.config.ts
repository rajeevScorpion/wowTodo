import { createTamagui } from 'tamagui';
import { defaultConfig } from '@tamagui/config/v5';
import { themes } from './themes';
import { headingFont, bodyFont } from './fonts';

const config = createTamagui({
    ...defaultConfig,
    themes,
    fonts: {
        ...defaultConfig.fonts,
        heading: headingFont,
        body: bodyFont,
    },
    settings: {
        ...defaultConfig.settings,
        onlyAllowShorthands: false,
    },
});

export default config;
export type AppConfig = typeof config;

declare module 'tamagui' {
    interface TamaguiCustomConfig extends AppConfig {}
}

// Helper to safely access custom semantic theme tokens added via extendWithSemantics
// Usage: const colors = useSemanticColors()
export { useSemanticColors } from './useSemanticColors';
