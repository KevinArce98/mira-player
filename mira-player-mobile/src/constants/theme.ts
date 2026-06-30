import '@/global.css';

import { Platform } from 'react-native';

export const Brand = {
  shadowGrey: '#272727',
  sandyClay: '#D4AA7D',
} as const;

export const Colors = {
  light: {
    text: '#272727',
    background: '#FAF6EF',
    backgroundElement: '#F1EADF',
    backgroundSelected: '#E7DDCB',
    textSecondary: '#7C746A',
    tint: '#D4AA7D',
    accent: '#8A5A2E',
    onTint: '#272727',
    border: '#E5DBCA',
    danger: '#B4453B',
  },
  dark: {
    text: '#F3EEE6',
    background: '#272727',
    backgroundElement: '#323230',
    backgroundSelected: '#3C3B38',
    textSecondary: '#A39C90',
    tint: '#D4AA7D',
    accent: '#D4AA7D',
    onTint: '#272727',
    border: '#3B3A37',
    danger: '#E0857A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Montserrat_700Bold',
  displaySemibold: 'Montserrat_600SemiBold',
  displayExtra: 'Montserrat_800ExtraBold',
  mono: Platform.select({ ios: 'ui-monospace', android: 'monospace', web: 'monospace', default: 'monospace' }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
