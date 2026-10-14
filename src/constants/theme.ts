/**
 * Design tokens ported from the reference app's styles.css custom properties.
 * The reference app is light-only, so there is a single palette.
 *
 * Font weights: the reference CSS uses 550/650/750. RN only accepts weights in
 * hundreds, so they are rounded to the weight the reference *renders* as:
 * 550 -> '600', 650 -> '600' (both resolve to the same face as the reference),
 * 750 -> '800'.
 */

import { Platform, type ViewStyle } from 'react-native';

export const C = {
  bg: '#F5F3EF',
  outer: '#E7E4DE',
  surface: '#FCFBF9',
  surface2: '#FFFFFF',
  primary: '#2E7A6B',
  primaryPress: '#27695C',
  onPrimary: '#FFFFFF',
  primaryContainer: '#DBEDE7',
  onPrimaryContainer: '#1D4A41',
  text: '#222826',
  text2: '#6C7572',
  text3: '#A2AAA6',
  green: '#33915F',
  amber: '#C98A2E',
  red: '#D25050',
  redBg: '#FAE6E6',
  outline: '#E3E0D9',
  outline2: '#D3CFC6',
  track: '#ECEAE4',
  disabled: '#B9BFBC',
  shadowColor: '#202624',
  cardBorder: '#EBE8E1',
  dot: '#CDD2CE',
  openRow: '#F0F4F1',
  tileBg: '#F0EFEA',
  tileFg: '#A9AFAA',
  handle: '#D6D3CC',
  catBar: '#ECEBE5',
  hover: '#E6E4DE',
  pillDisabledBg: '#EFEDE8',
  btnDisabledBg: '#D8D6D0',
  btnDisabledText: '#9AA19D',
} as const;

export const R = { lg: 26, md: 18, sm: 12 } as const;

const SHADOWS = {
  1: {
    ios: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, shadowOpacity: 0.09 },
    android: { elevation: 2 },
    web: '0 1px 2px rgba(32,38,36,.05), 0 4px 16px rgba(32,38,36,.07)',
  },
  2: {
    ios: { shadowOffset: { width: 0, height: 10 }, shadowRadius: 28, shadowOpacity: 0.14 },
    android: { elevation: 6 },
    web: '0 2px 6px rgba(32,38,36,.09), 0 10px 28px rgba(32,38,36,.13)',
  },
  3: {
    ios: { shadowOffset: { width: 0, height: 18 }, shadowRadius: 44, shadowOpacity: 0.2 },
    android: { elevation: 12 },
    web: '0 6px 14px rgba(32,38,36,.13), 0 18px 44px rgba(32,38,36,.19)',
  },
} as const;

/** Box shadow for elevation level 1..3, matching the reference's --sh-1..--sh-3. */
export function shadow(level: 1 | 2 | 3): ViewStyle {
  const s = SHADOWS[level];
  if (Platform.OS === 'web') {
    return { shadowColor: C.shadowColor, boxShadow: s.web } as ViewStyle;
  }
  if (Platform.OS === 'android') {
    return { shadowColor: C.shadowColor, ...s.android } as ViewStyle;
  }
  return { shadowColor: C.shadowColor, ...s.ios } as ViewStyle;
}

/** The app frame is capped at 430px and centered, like the reference's #app. */
export const APP_MAX_WIDTH = 430;
