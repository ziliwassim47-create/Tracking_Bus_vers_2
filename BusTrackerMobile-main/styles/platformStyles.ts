import { Platform, TextStyle, ViewStyle } from 'react-native';

export const supportsNativeAnimations = Platform.OS !== 'web';

function cssColor(color: string, opacity: number): string {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) return color;

  const normalized = hex.length === 3
    ? hex.split('').map(character => character + character).join('')
    : hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function platformShadow(
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
  offsetX = 0,
): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: opacity === 0 ? 'none' : `${offsetX}px ${offsetY}px ${radius}px ${cssColor(color, opacity)}` } as ViewStyle;
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export function platformTextShadow(
  color: string,
  offsetY: number,
  radius: number,
  offsetX = 0,
): TextStyle {
  if (Platform.OS === 'web') {
    return { textShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}` } as TextStyle;
  }

  return {
    textShadowColor: color,
    textShadowOffset: { width: offsetX, height: offsetY },
    textShadowRadius: radius,
  };
}
