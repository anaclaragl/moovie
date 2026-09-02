export const colors = {
  bgBase: '#0B0A0F',
  bgSurface: '#16141C',
  bgElevated: '#1F1C26',
  bgElevated2: '#272330',
  border: '#2B2733',
  textPrimary: '#F4F1EC',
  textSecondary: '#948FA0',
  textTertiary: '#635E70',
  // Verde Musgo (Cor de destaque do Moovie)
  accent: '#82A767',
  accentSoft: '#212C1A',
  accentBorder: '#3B4E30',
  moss: '#82A767',
  mossSoft: '#212C1A',
  gold: '#82A767', // Verde Musgo principal
  goldSoft: '#212C1A', // Fundo sutil do Verde Musgo
  ana: '#4FC7C2',
  anaSoft: '#173634',
  luisa: '#E4699A',
  luisaSoft: '#3A1F2A',
};

export const fonts = {
  display: 'Fraunces_500Medium',
  displayItalic: 'Fraunces_500Medium_Italic',
  displaySemibold: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
};

// Boilerplate template compatibility
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = 50;
export const MaxContentWidth = 800;

export type ThemeColor = 'text' | 'background' | 'backgroundElement' | 'backgroundSelected' | 'textSecondary';

export const Fonts = {
  sans: 'normal',
  serif: 'serif',
  rounded: 'normal',
  mono: 'monospace',
};

export const Colors = {
  light: {
    text: colors.textPrimary,
    background: colors.bgBase,
    backgroundElement: colors.bgSurface,
    backgroundSelected: colors.bgElevated,
    textSecondary: colors.textSecondary,
  },
  dark: {
    text: colors.textPrimary,
    background: colors.bgBase,
    backgroundElement: colors.bgSurface,
    backgroundSelected: colors.bgElevated,
    textSecondary: colors.textSecondary,
  },
};
