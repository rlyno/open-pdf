/**
 * Design tokens, following the "Precision PDF Utility" design: a low-glare
 * slate/navy surface stack with an electric-indigo accent and crimson
 * reserved for destructive actions. Dark is the reference; light mirrors it.
 */
export const Colors = {
  dark: {
    background: '#0B1326',
    surface: '#171F33',
    surfaceHigh: '#222A3D',
    /** Inset fields and pills. */
    surfaceLowest: '#060E20',
    text: '#DAE2FD',
    textSecondary: '#C5C6CD',
    textMuted: '#8F9097',
    border: 'rgba(255,255,255,0.08)',
    accent: '#4F46E5',
    accentText: '#FFFFFF',
    /** Indigo tint for selected chips, badges and icon tiles. */
    accentSoft: 'rgba(79,70,229,0.22)',
    /** Readable indigo on dark surfaces (links, eyebrows, active labels). */
    accentOnSurface: '#C3C0FF',
    danger: '#DC2626',
    dangerText: '#FFB4AB',
    dangerSoft: 'rgba(220,38,38,0.18)',
    success: '#4ADE80',
    successSoft: 'rgba(74,222,128,0.14)',
    /** Floating chrome (tab bar) over content. */
    chrome: 'rgba(23,31,51,0.985)',
  },
  light: {
    background: '#F3F5FA',
    surface: '#FFFFFF',
    surfaceHigh: '#E9EDF5',
    surfaceLowest: '#E4E9F2',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    border: 'rgba(15,23,42,0.08)',
    accent: '#4F46E5',
    accentText: '#FFFFFF',
    accentSoft: 'rgba(79,70,229,0.10)',
    accentOnSurface: '#4338CA',
    danger: '#DC2626',
    dangerText: '#B91C1C',
    dangerSoft: 'rgba(220,38,38,0.08)',
    success: '#15803D',
    successSoft: 'rgba(21,128,61,0.10)',
    chrome: 'rgba(255,255,255,0.985)',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.dark]: string };
export type ThemeColor = keyof Palette;

/** Inter, loaded in the root layout. Custom fonts pick weight by family. */
export const Font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Type scale from the design system (sizes in points). */
export const Type = {
  headlineXl: { fontFamily: Font.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  headlineLg: { fontFamily: Font.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.36 },
  headlineMd: { fontFamily: Font.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  titleSm: { fontFamily: Font.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.08 },
  bodyLg: { fontFamily: Font.regular, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: Font.regular, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: Font.regular, fontSize: 12, lineHeight: 16 },
  labelLg: { fontFamily: Font.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.14 },
  labelMd: { fontFamily: Font.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.18 },
  labelSm: { fontFamily: Font.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.3 },
} as const;

export const Radius = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 } as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Clearance so content can scroll past the floating tab bar. */
export const TabBarClearance = 96;
export const MaxContentWidth = 800;
