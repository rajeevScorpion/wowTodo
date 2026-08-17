import { createV5Theme, defaultChildrenThemes } from '@tamagui/config/v5'
import { v5ComponentThemes } from '@tamagui/themes/v5'
import { yellow, yellowDark, red, redDark, green, greenDark } from '@tamagui/colors'

// ── Neomorphic palettes ──────────────────────────────────────────────
// 12-stop palette: index 0 = lightest bg … index 11 = darkest text (light mode)
// For dark mode the direction is reversed (0 = darkest bg … 11 = lightest text)

const lightPalette = [
  '#F6F7FB', // 0  bg
  '#F9FAFF', // 1  surface
  '#F1F3FA', // 2  inset
  '#E8EAF2', // 3  subtle border / hover
  '#D8DBE8', // 4  border
  '#B0B5C6', // 5  placeholder
  '#6B7280', // 6  muted text
  '#556070', // 7  secondary text
  '#3D4A5C', // 8  strong secondary
  '#2A3344', // 9  near-foreground
  '#1E2536', // 10 heading
  '#121826', // 11 foreground text
]

const darkPalette = [
  '#0B0F19', // 0  bg
  '#111827', // 1  surface
  '#0F1626', // 2  inset
  '#1A2235', // 3  subtle border / hover
  '#253044', // 4  border
  '#3D4E66', // 5  placeholder
  '#A7AFBF', // 6  muted text
  '#B8C0D0', // 7  secondary text
  '#C8CEE0', // 8  strong secondary
  '#D4D9E8', // 9  near-foreground
  '#DFE3EE', // 10 heading
  '#E7EAF2', // 11 foreground text
]

// ── Accent palettes (neo gold / mint / blue tones) ───────────────────
const accentLight = {
  accent1:  '#FFF8E7',
  accent2:  '#FFF1CC',
  accent3:  '#FFE8AA',
  accent4:  '#FEDD88',
  accent5:  '#F0CC66',
  accent6:  '#DDBA55',
  accent7:  '#C9A24A',
  accent8:  '#B08A3E',
  accent9:  '#C9A24A', // primary accent (gold)
  accent10: '#B08A3E', // hover
  accent11: '#967232', // press
  accent12: '#6B5020',
}

const accentDark = {
  accent1:  '#1A1508',
  accent2:  '#2A2210',
  accent3:  '#3D3218',
  accent4:  '#524422',
  accent5:  '#6B582E',
  accent6:  '#8A7240',
  accent7:  '#B89550',
  accent8:  '#CCA84E',
  accent9:  '#E0B357', // primary accent (gold)
  accent10: '#EECA70', // hover
  accent11: '#F5DC90', // press
  accent12: '#FFF3D0',
}

const builtThemes = createV5Theme({
  darkPalette,
  lightPalette,
  componentThemes: v5ComponentThemes,
  accent: {
    light: accentLight,
    dark: accentDark,
  },
  childrenThemes: {
    ...defaultChildrenThemes,
    warning: {
      light: yellow,
      dark: yellowDark,
    },
    error: {
      light: red,
      dark: redDark,
    },
    success: {
      light: green,
      dark: greenDark,
    },
  },
})

// Extend base themes with semantic tokens so existing components
// using $primary, $cardBackground, $muted, $error etc. keep working
function extendWithSemantics(themes: Record<string, any>) {
  const extended = { ...themes }

  if (extended.light) {
    extended.light = {
      ...extended.light,
      // ── Existing semantic tokens (DO NOT REMOVE) ──
      // Use darker gold (#8B6914) in light mode for better contrast on white
      primary: '#8B6914',
      primaryHover: '#7A5B10',
      primaryPress: '#6B5020',
      secondary: extended.light.color8,
      muted: extended.light.color7,
      cardBackground: extended.light.color2,
      cardBorder: extended.light.borderColor,
      error: extended.light.red9,
      errorBackground: extended.light.red3,
      success: extended.light.green9,
      successBackground: extended.light.green3,
      warning: '#92700C',  // darker warning for light mode contrast
      warningBackground: extended.light.yellow3,
      info: extended.light.blue9,
      infoBackground: extended.light.blue3,
      // ── Neo semantic tokens (NEW) ──
      neoBg: '#F6F7FB',
      neoSurface: '#F9FAFF',
      neoInset: '#F1F3FA',
      hairline: 'rgba(17,24,39,0.08)',
      neoAccentGold: '#8B6914',
      neoAccentMint: '#2D8A62',
      neoAccentBlue: '#4A68D9',
    }
  }

  if (extended.dark) {
    extended.dark = {
      ...extended.dark,
      // ── Existing semantic tokens (DO NOT REMOVE) ──
      primary: extended.dark.accent9,
      primaryHover: extended.dark.accent10,
      primaryPress: extended.dark.accent11,
      secondary: extended.dark.color8,
      muted: extended.dark.color7,
      cardBackground: extended.dark.color2,
      cardBorder: extended.dark.borderColor,
      error: extended.dark.red9,
      errorBackground: extended.dark.red3,
      success: extended.dark.green9,
      successBackground: extended.dark.green3,
      warning: extended.dark.yellow9,
      warningBackground: extended.dark.yellow3,
      info: extended.dark.blue9,
      infoBackground: extended.dark.blue3,
      // ── Neo semantic tokens (NEW) ──
      neoBg: '#0B0F19',
      neoSurface: '#111827',
      neoInset: '#0F1626',
      hairline: 'rgba(231,234,242,0.10)',
      neoAccentGold: '#E0B357',
      neoAccentMint: '#4AD6A0',
      neoAccentBlue: '#7CA0FF',
    }
  }

  return extended
}

export const themes = extendWithSemantics(builtThemes)
