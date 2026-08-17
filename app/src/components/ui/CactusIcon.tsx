import Svg, { Path, Circle } from 'react-native-svg';

interface CactusIconProps {
    size?: number;
    color?: string;
}

export function CactusIcon({
    size = 24,
    color = '#8B7355',
}: CactusIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            {/* Main stem */}
            <Path
                d="M12 4C12 4 12 3 12 3C12 2 11 2 11 2C10 2 10 3 10 3L10 18C10 18 10 19 11 19C11.5 19 12 19 12.5 19C13 19 13 18 13 18L13 11C13 11 14 11 15 11C16 11 16 10 16 9C16 8 16 7 15 7C14 7 13 7 13 8L13 4C13 4 13 4 12 4Z"
                fill={color}
            />
            {/* Left arm */}
            <Path
                d="M10 10L10 12C10 12 9 12 8 12C7 12 7 11 7 10C7 9 7 8 8 8C9 8 10 8 10 9L10 10Z"
                fill={color}
            />
            {/* Pot */}
            <Path
                d="M8 19L16 19L15 22C15 22.5 14.5 23 14 23L10 23C9.5 23 9 22.5 9 22L8 19Z"
                fill={color}
                opacity={0.7}
            />
            {/* Pot rim */}
            <Path
                d="M7.5 18.5L16.5 18.5C16.5 18.5 17 18.5 17 19C17 19.5 16.5 19.5 16.5 19.5L7.5 19.5C7.5 19.5 7 19.5 7 19C7 18.5 7.5 18.5 7.5 18.5Z"
                fill={color}
                opacity={0.85}
            />
            {/* Flower dots */}
            <Circle cx="11.5" cy="2.5" r="0.8" fill={color} opacity={0.5} />
            <Circle cx="13" cy="3" r="0.6" fill={color} opacity={0.5} />
        </Svg>
    );
}
