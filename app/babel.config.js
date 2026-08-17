module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo"],
        ],
        plugins: [
            [
                '@tamagui/babel-plugin',
                {
                    components: ['tamagui'],
                    config: './src/design-system/tamagui.config.ts',
                },
            ],
            'react-native-reanimated/plugin', // MUST be last
        ],
    };
};
